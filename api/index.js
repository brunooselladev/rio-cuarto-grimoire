import dotenv from "dotenv";
dotenv.config();

import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import serverless from 'serverless-http';
import { connectDB } from './lib/db.js';
import Location from './models/Location.js';
import User from './models/User.js';
import { seedLocationsIfEmpty, seedAdminIfMissing } from './lib/seed.js';
import { verifyPassword } from './lib/password.js';
import { authRequired } from './lib/auth.js';
import characterRoutes from './routes/character.js';
import notesRouter from './routes/notes.js';



const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    await connectDB();
    await seedAdminIfMissing();

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

// Ensure DB connection for subsequent routes
app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    await seedLocationsIfEmpty();
    await seedAdminIfMissing();
    next();
  } catch (err) {
    next(err);
  }
});

// Locations CRUD
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
    // Permitimos actualizar todos estos campos
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

// Add event to a location
app.post('/api/locations/:id/events', authRequired, async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const { content } = req.body;
    const location = await Location.findById(req.params.id);
    if (!location) return res.status(404).json({ error: 'Location not found' });

    const newEvent = {
      content,
      createdBy: req.user.id,
    };

    location.events.push(newEvent);
    await location.save();
    res.status(201).json(location.events[location.events.length - 1]);
  } catch (err) {
    next(err);
  }
});

// Update an event
app.put('/api/locations/:id/events/:eventId', authRequired, async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const { content } = req.body;
    const location = await Location.findById(req.params.id);
    if (!location) return res.status(404).json({ error: 'Location not found' });

    const event = location.events.id(req.params.eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Check if the user is the creator of the event
    if (event.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    event.content = content;
    await location.save();
    res.json(event);
  } catch (err) {
    next(err);
  }
});

// Delete an event
app.delete('/api/locations/:id/events/:eventId', authRequired, async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const location = await Location.findById(req.params.id);
    if (!location) return res.status(404).json({ error: 'Location not found' });

    const event = location.events.id(req.params.eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Check if the user is the creator of the event
    if (event.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    event.remove();
    await location.save();
    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    next(err);
  }
});

app.post('/api/create-admin', async (req, res) => {
  try {
    const { username, password, role } = req.body

    const existing = await User.findOne({ username })
    if (existing) return res.status(400).json({ message: 'El usuario ya existe' })

    const newUser = new User({ username, password, role })
    await newUser.save()

    res.status(201).json({ message: 'Usuario creado con éxito', user: newUser })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error al crear el usuario', error: err.message })
  }
})


app.use('/api/character', characterRoutes);
app.use('/api/notes', notesRouter);

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

// Para Vercel - exportar la app directamente
export default app;