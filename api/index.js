import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import serverless from 'serverless-http';
import { connectDB } from './lib/db.js';
import Location from './models/Location.js';

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Auth middleware
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

// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { sub: username, role: 'admin' },
    process.env.JWT_SECRET || 'dev-secret-change-me',
    { expiresIn: '7d' },
  );
  res.json({ token });
});

// Ensure DB connection for subsequent routes
app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

// Locations CRUD
app.get('/api/locations', async (_req, res, next) => {
  try {
    const locations = await Location.find().sort({ createdAt: -1 }).lean();
    res.json(locations);
  } catch (err) {
    next(err);
  }
});

app.post('/api/locations', authRequired, async (req, res, next) => {
  try {
    const { name, description, lat, lng, type, visible, sphere, narration } = req.body || {};

    if (!name || typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ error: 'name, lat and lng are required' });
    }

    const loc = await Location.create({
      name,
      description: description || '',
      lat,
      lng,
      type: type || 'power',
      visible: typeof visible === 'boolean' ? visible : true,
      sphere: sphere || '',
      narration: narration || '',
    });
    res.status(201).json(loc);
  } catch (err) {
    next(err);
  }
});

app.put('/api/locations/:id', authRequired, async (req, res, next) => {
  try {
    const updates = {};
    const allowed = ['name', 'description', 'lat', 'lng', 'type', 'visible', 'sphere', 'narration'];
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

export default serverless(app);