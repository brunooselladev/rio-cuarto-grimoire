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
import Wizard, { createWizardDefaults, WIZARD_LOCATIONS, WIZARD_MODES } from './models/Wizard.js';
import { verifyPassword, hashPassword } from './lib/password.js';

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

function authOptional(req, _res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-me');
    req.user = payload;
  } catch (_err) {
    req.user = null;
  }

  next();
}

function requireAdmin(req, res, next) {
  authRequired(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  });
}

const FALLBACK_WIZARD_SPEECH = 'Los caminos del conocimiento est\u00e1n... temporalmente cerrados.';
const WIZARD_UPDATE_SHAPE = {
  urgentMessage: {
    active: true,
    text: true,
    dismissedBy: true,
  },
  hidden: {
    active: true,
    location: true,
    mode: true,
    topics: true,
    examplePhrases: true,
    systemPrompt: true,
    rulesContext: true,
    lore: true,
  },
};
const WIZARD_DEFAULT_INSERT_PATHS = {
  'urgentMessage.active': false,
  'urgentMessage.text': '',
  'urgentMessage.dismissedBy': [],
  'hidden.active': false,
  'hidden.location': 'map',
  'hidden.mode': 'topics',
  'hidden.topics': [],
  'hidden.examplePhrases': [],
  'hidden.systemPrompt': '',
  'hidden.rulesContext': '',
  'hidden.lore': '',
  'notes': [],
};

function flattenAllowedUpdate(input, shape, prefix = '') {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }

  const updates = {};

  for (const [key, nestedShape] of Object.entries(shape)) {
    if (!(key in input)) {
      continue;
    }

    const value = input[key];
    const path = prefix ? `${prefix}.${key}` : key;

    if (nestedShape === true) {
      updates[path] = value;
      continue;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(updates, flattenAllowedUpdate(value, nestedShape, path));
    }
  }

  return updates;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return null;
  }

  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

function normalizeWizardSetUpdates(flatUpdates) {
  const normalized = {};

  for (const [path, value] of Object.entries(flatUpdates)) {
    switch (path) {
      case 'urgentMessage.active':
      case 'hidden.active':
        normalized[path] = Boolean(value);
        break;
      case 'urgentMessage.text':
      case 'hidden.systemPrompt':
      case 'hidden.rulesContext':
      case 'hidden.lore':
        normalized[path] = String(value || '').trim();
        break;
      case 'urgentMessage.dismissedBy':
        if (!Array.isArray(value)) {
          throw new Error(`Invalid value for ${path}`);
        }
        normalized[path] = value;
        break;
      case 'hidden.location':
        if (!WIZARD_LOCATIONS.includes(value)) {
          throw new Error('Invalid hidden.location');
        }
        normalized[path] = value;
        break;
      case 'hidden.mode':
        if (!WIZARD_MODES.includes(value)) {
          throw new Error('Invalid hidden.mode');
        }
        normalized[path] = value;
        break;
      case 'hidden.topics':
      case 'hidden.examplePhrases': {
        const arrayValue = normalizeStringArray(value);
        if (!arrayValue) {
          throw new Error(`Invalid value for ${path}`);
        }
        normalized[path] = arrayValue;
        break;
      }
      default:
        break;
    }
  }

  return normalized;
}

function buildWizardInsertDefaults(skipPaths = []) {
  const skipSet = new Set(skipPaths);

  return Object.fromEntries(
    Object.entries(WIZARD_DEFAULT_INSERT_PATHS).filter(([path]) => !skipSet.has(path)),
  );
}

async function getWizardDocument() {
  return Wizard.findOneAndUpdate(
    {},
    { $setOnInsert: buildWizardInsertDefaults() },
    { new: true, upsert: true },
  );
}

function buildWizardResponse(doc, userId = null) {
  const source = doc?.toObject ? doc.toObject() : (doc || {});
  const defaults = createWizardDefaults();

  const wizard = {
    ...source,
    urgentMessage: {
      ...defaults.urgentMessage,
      ...(source.urgentMessage || {}),
      dismissedBy: source.urgentMessage?.dismissedBy || [],
    },
    hidden: {
      ...defaults.hidden,
      ...(source.hidden || {}),
      topics: source.hidden?.topics || [],
      examplePhrases: source.hidden?.examplePhrases || [],
      rulesContext: source.hidden?.rulesContext || '',
      lore: source.hidden?.lore || '',
    },
  };

  const dismissed = userId
    ? wizard.urgentMessage.dismissedBy.some((dismissedId) => String(dismissedId) === String(userId))
    : false;

  return {
    ...wizard,
    notes: source.notes || [],
    computed: {
      urgentMessage: {
        dismissed,
      },
    },
  };
}

function buildWizardSystemPrompt(hiddenConfig = {}, notes = []) {
  const styleRules = [
    'Sos El Mago Digital de Rio Cuarto Grimoire.',
    'Hablas siempre en primera persona como un mago oscuro de estetica cyberpunk noventosa.',
    'Tu voz es criptica, arcana, ominosa y elegante.',
    'Usa espanol rioplatense con un leve tono arcaico.',
    'Responde con una sola intervencion breve, sin markdown, sin listas, sin comillas y sin prefijos.',
    'No superes las 80 palabras.',
    'Podes responder preguntas sobre las reglas del juego, la trama o el mundo si el jugador pregunta. Mantene siempre el personaje.',
  ];

  // Contexto base siempre presente: reglas y trama
  const baseContext = [];
  if (hiddenConfig.rulesContext?.trim()) {
    baseContext.push(`Conocimiento sobre las reglas del juego (Mago: La Ascension y variantes de esta cronica):\n${hiddenConfig.rulesContext.trim()}`);
  }
  if (hiddenConfig.lore?.trim()) {
    baseContext.push(`Trama y contexto de esta cronica en particular:\n${hiddenConfig.lore.trim()}`);
  }

  if (hiddenConfig.mode === 'full_prompt' && hiddenConfig.systemPrompt?.trim()) {
    const sections = [`${hiddenConfig.systemPrompt.trim()}\n\nReglas obligatorias:\n${styleRules.join('\n')}`];
    if (baseContext.length) sections.push(baseContext.join('\n\n'));
    return sections.join('\n\n');
  }

  const promptSections = [...styleRules];

  if (baseContext.length) {
    promptSections.push(baseContext.join('\n\n'));
  }

  if (notes.length) {
    const noteLines = notes.map((n) => `- ${n.content}`).join('\n');
    promptSections.push(`Notas acumuladas del narrador (memoria de la cronica):\n${noteLines}`);
  }

  if (hiddenConfig.topics?.length) {
    promptSections.push(`Instrucciones y comportamiento para esta sesion (del narrador):\n- ${hiddenConfig.topics.join('\n- ')}`);
  }

  if (hiddenConfig.mode === 'examples' && hiddenConfig.examplePhrases?.length) {
    promptSections.push(
      `Frases de ejemplo para imitar y variar sin copiarlas literalmente:\n- ${hiddenConfig.examplePhrases.join('\n- ')}`,
    );
  }

  if (hiddenConfig.mode === 'topics') {
    promptSections.push('Improvisa libremente siguiendo las instrucciones del narrador. Si el jugador pregunta algo fuera de los topicos, respondele igual manteniendote en personaje.');
  }

  if (hiddenConfig.mode === 'examples') {
    promptSections.push('Usa los ejemplos como referencia tonal y de cadencia, con variaciones propias.');
  }

  return promptSections.join('\n\n');
}

function sanitizeWizardSpeech(text) {
  const cleaned = String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/^["'“”]+|["'“”]+$/g, '')
    .trim();

  if (!cleaned) {
    return FALLBACK_WIZARD_SPEECH;
  }

  const words = cleaned.split(' ');
  if (words.length <= 80) {
    return cleaned;
  }

  return `${words.slice(0, 80).join(' ')}...`;
}

function extractAnthropicText(payload) {
  if (!Array.isArray(payload?.content)) {
    return '';
  }

  return payload.content
    .filter((block) => block?.type === 'text' && block.text)
    .map((block) => block.text)
    .join(' ')
    .trim();
}

// Auth Router
const authRouter = express.Router();

authRouter.get('/verify', authRequired, (req, res) => {
  res.json({ id: req.user.id, username: req.user.sub, role: req.user.role });
});

authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    await connectDB();
    const user = await User.findOne({ username: String(username).toLowerCase().trim() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Auto-migrate plain text passwords to bcrypt
    if (user.password.length < 60 || !/^\$2[aby]\$/.test(user.password)) {
      const hashed = await hashPassword(password);
      await User.updateOne({ _id: user._id }, { $set: { password: hashed } });
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

app.get('/api/wizard', authOptional, async (req, res, next) => {
  try {
    const wizard = await getWizardDocument();
    res.json(buildWizardResponse(wizard, req.user?.id));
  } catch (err) {
    next(err);
  }
});

app.put('/api/wizard', requireAdmin, async (req, res, next) => {
  try {
    const flatUpdates = flattenAllowedUpdate(req.body || {}, WIZARD_UPDATE_SHAPE);
    const normalizedUpdates = normalizeWizardSetUpdates(flatUpdates);

    if (Object.keys(normalizedUpdates).length === 0) {
      return res.status(400).json({ error: 'No valid wizard fields provided' });
    }

    const wizard = await Wizard.findOneAndUpdate(
      {},
      {
        $setOnInsert: buildWizardInsertDefaults(Object.keys(normalizedUpdates)),
        $set: normalizedUpdates,
      },
      { new: true, upsert: true },
    );

    res.json(buildWizardResponse(wizard, req.user?.id));
  } catch (err) {
    if (err.message?.startsWith('Invalid') || err.message?.includes('wizard fields')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

app.post('/api/wizard/dismiss', authRequired, async (req, res, next) => {
  try {
    const wizard = await Wizard.findOneAndUpdate(
      {},
      {
        $setOnInsert: buildWizardInsertDefaults(['urgentMessage.dismissedBy']),
        $addToSet: { 'urgentMessage.dismissedBy': req.user.id },
      },
      { new: true, upsert: true },
    );

    res.json(buildWizardResponse(wizard, req.user.id));
  } catch (err) {
    next(err);
  }
});

app.post('/api/wizard/speak', authRequired, async (req, res, next) => {
  try {
    const wizard = await getWizardDocument();
    const hiddenConfig = wizard.hidden || createWizardDefaults().hidden;
    const systemPrompt = buildWizardSystemPrompt(hiddenConfig, wizard.notes || []);

    // Support chat history: array of { role: 'user'|'assistant', content: string }
    const history = Array.isArray(req.body?.history) ? req.body.history : [];
    const userMessage = typeof req.body?.message === 'string' ? req.body.message.trim() : '';

    if (!process.env.GROQ_API_KEY && !process.env.ANTHROPIC_API_KEY) {
      return res.json({ text: FALLBACK_WIZARD_SPEECH });
    }

    // Groq takes priority (free). Falls back to Anthropic if only that key exists.
    const useGroq = !!process.env.GROQ_API_KEY;
    const apiUrl = useGroq
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://api.anthropic.com/v1/messages';
    const apiKey = useGroq ? process.env.GROQ_API_KEY : process.env.ANTHROPIC_API_KEY;

    // Build messages array: must start with 'user' and alternate roles
    const rawMessages = [];
    for (const entry of history) {
      if ((entry.role === 'user' || entry.role === 'assistant') && typeof entry.content === 'string') {
        rawMessages.push({ role: entry.role, content: entry.content });
      }
    }
    if (userMessage) {
      rawMessages.push({ role: 'user', content: userMessage });
    }

    // Ensure first message is always 'user' (Anthropic requirement)
    const firstUserIdx = rawMessages.findIndex((m) => m.role === 'user');
    const trimmedMessages = firstUserIdx > 0 ? rawMessages.slice(firstUserIdx) : rawMessages;

    const messages = trimmedMessages.length > 0
      ? trimmedMessages
      : [{ role: 'user', content: 'El jugador acaba de encontrar al Mago Oculto. Pronuncia una unica frase breve, memorable y en personaje.' }];

    try {
      console.log(`[wizard/speak] provider: ${useGroq ? 'groq' : 'anthropic'} | messages:`, JSON.stringify(messages));

      let requestBody;
      let requestHeaders;

      if (useGroq) {
        requestHeaders = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        };
        requestBody = JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 180,
          temperature: 0.95,
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
        });
      } else {
        requestHeaders = {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        };
        requestBody = JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 180,
          temperature: 0.95,
          system: systemPrompt,
          messages,
        });
      }

      const aiResponse = await fetch(apiUrl, { method: 'POST', headers: requestHeaders, body: requestBody });
      const rawBody = await aiResponse.text();
      console.log(`[wizard/speak] status: ${aiResponse.status} | body:`, rawBody);

      if (!aiResponse.ok) {
        throw new Error(`AI error ${aiResponse.status}: ${rawBody}`);
      }

      const payload = JSON.parse(rawBody);
      let generatedText;

      if (useGroq) {
        generatedText = sanitizeWizardSpeech(payload?.choices?.[0]?.message?.content || '');
      } else {
        generatedText = sanitizeWizardSpeech(extractAnthropicText(payload));
      }

      return res.json({ text: generatedText || FALLBACK_WIZARD_SPEECH });
    } catch (aiError) {
      console.error('[wizard/speak] ERROR:', aiError.message);
      return res.json({ text: FALLBACK_WIZARD_SPEECH });
    }
  } catch (err) {
    next(err);
  }
});

// Wizard Notes endpoints
app.post('/api/wizard/notes', requireAdmin, async (req, res, next) => {
  try {
    const content = String(req.body?.content || '').trim();
    if (!content) return res.status(400).json({ error: 'content is required' });
    const wizard = await Wizard.findOneAndUpdate(
      {},
      {
        $push: { notes: { content, createdAt: new Date() } },
        $setOnInsert: buildWizardInsertDefaults(['notes']),
      },
      { new: true, upsert: true },
    );
    res.json(buildWizardResponse(wizard, req.user.id));
  } catch (err) { next(err); }
});

app.delete('/api/wizard/notes/:noteId', requireAdmin, async (req, res, next) => {
  try {
    const wizard = await Wizard.findOneAndUpdate(
      {},
      { $pull: { notes: { _id: req.params.noteId } } },
      { new: true },
    );
    if (!wizard) return res.status(404).json({ error: 'Wizard not found' });
    res.json(buildWizardResponse(wizard, req.user.id));
  } catch (err) { next(err); }
});

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
      createdBy: req.user.id,
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
