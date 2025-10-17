import dotenv from "dotenv";
dotenv.config();

import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { connectDB } from './lib/db.js';
import Location from './models/Location.js';
import User from './models/User.js';
import CharacterSheet from './models/CharacterSheet.js';
import Event from './models/Event.js';
import AdminNote from './models/AdminNote.js';
import { verifyPassword } from './lib/password.js';

const app = express();
app.use(cors());
app.use(express.json());

// Auth Middleware
function authRequired(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-me');
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Auth Router
const authRouter = express.Router();

authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    await connectDB();
    const user = await User.findOne({ username: String(username).toLowerCase().trim() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isValid = verifyPassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, sub: user.username, role: user.role || 'admin' },
      process.env.JWT_SECRET || 'dev-secret-change-me',
      { expiresIn: '7d' },
    );
    res.json({ token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Character Router
const characterRouter = express.Router();

characterRouter.get('/all', authRequired, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const sheets = await CharacterSheet.find().populate('user', 'username');
    res.json(sheets);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

characterRouter.get('/me', authRequired, async (req, res) => {
  try {
    let sheet = await CharacterSheet.findOne({ user: req.user.id });

    if (!sheet) {
      sheet = new CharacterSheet({ user: req.user.id });
      await sheet.save();
    }

    res.json(sheet);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

characterRouter.post('/', authRequired, async (req, res) => {
  const { ...sheetData } = req.body;

  try {
    let sheet = await CharacterSheet.findOne({ user: req.user.id });

    if (sheet) {
      sheet = await CharacterSheet.findOneAndUpdate(
        { user: req.user.id },
        { $set: sheetData },
        { new: true }
      );
      return res.json(sheet);
    }

    sheet = new CharacterSheet({
      ...sheetData,
      user: req.user.id,
    });

    await sheet.save();
    res.json(sheet);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Events Router
const eventsRouter = express.Router();

eventsRouter.get('/', async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 });
    res.json(events);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

eventsRouter.post('/', authRequired, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { content, title } = req.body;

  try {
    const newEvent = new Event({
      title,
      content,
    });

    await newEvent.save();
    res.status(201).json(newEvent);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

eventsRouter.delete('/:id', authRequired, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Notes Router
const notesRouter = express.Router();

notesRouter.get('/:playerId', authRequired, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const notes = await AdminNote.find({ player: req.params.playerId }).populate('admin', 'username');
    res.json(notes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

notesRouter.post('/', authRequired, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { playerId, content } = req.body;

  try {
    const newNote = new AdminNote({
      player: playerId,
      admin: req.user.id,
      content,
    });

    await newNote.save();
    res.json(newNote);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

notesRouter.put('/:noteId', authRequired, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { content } = req.body;

  try {
    const updatedNote = await AdminNote.findOneAndUpdate(
      { _id: req.params.noteId, admin: req.user.id },
      { content },
      { new: true }
    );

    if (!updatedNote) {
      return res.status(404).json({ error: 'Note not found or you are not the owner' });
    }

    res.json(updatedNote);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

notesRouter.delete('/:noteId', authRequired, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const deletedNote = await AdminNote.findOneAndDelete({
      _id: req.params.noteId,
      admin: req.user.id,
    });

    if (!deletedNote) {
      return res.status(404).json({ error: 'Note not found or you are not the owner' });
    }

    res.json({ message: 'Note deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Main App
app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/character', characterRouter);
app.use('/api/events', eventsRouter);
app.use('/api/notes', notesRouter);

// Locations CRUD (remains in the main app)
app.get('/api/locations', async (_req, res, next) => {
  try {
    const locations = await Location.find().populate('createdBy', 'username role').sort({ createdAt: -1 }).lean();
    res.json(locations);
  } catch (err) {
    next(err);
  }
});

app.post('/api/locations', authRequired, async (req, res, next) => {
  try {
    const { name, description, lat, lng, type, visible, sphere, narration, address, images } = req.body || {};

    if (!name || typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ error: 'name, lat and lng are required' });
    }

    const user = await User.findOne({ username: req.user.sub });

    const loc = await Location.create({
      name,
      description: description || '',
      lat,
      lng,
      type: type || 'power',
      visible: typeof visible === 'boolean' ? visible : true,
      sphere: sphere || '',
      narration: narration || '',
      address: address || '',
      images: images || [],
      createdBy: user ? user._id : null,
    });
    res.status(201).json(loc);
  } catch (err) {
    next(err);
  }
});

app.put('/api/locations/:id', authRequired, async (req, res, next) => {
  try {
    const allowed = [
      'name',
      'description',
      'lat',
      'lng',
      'type',
      'visible',
      'sphere',
      'narration',
      'address',
      'images',
    ];

    const updates = {};
    for (const key of allowed) {
      if (key in req.body) updates[key] = req.body[key];
    }

    const loc = await Location.findByIdAndUpdate(req.params.id, updates, { new: true });

    if (!loc) return res.status(404).json({ error: 'Not found' });
    res.json(loc);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/locations/:id', authRequired, async (req, res, next) => {
  try {
    const loc = await Location.findByIdAndDelete(req.params.id);
    if (!loc) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error('API error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Para desarrollo local
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`✅ API corriendo en http://localhost:${PORT}`);
  });
}

export default app;