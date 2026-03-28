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
import PlayerMemory from './models/PlayerMemory.js';
import Avatar from './models/Avatar.js';
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
    puzzle: {
      active: true,
      description: true,
      sello: true,
      solvedBy: true,
    },
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
  'hidden.puzzle.active': false,
  'hidden.puzzle.description': '',
  'hidden.puzzle.sello': '',
  'hidden.puzzle.solvedBy': [],
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
      case 'hidden.puzzle.active':
        normalized[path] = Boolean(value);
        break;
      case 'hidden.puzzle.description':
      case 'hidden.puzzle.sello':
        normalized[path] = String(value || '').trim();
        break;
      case 'hidden.puzzle.solvedBy':
        if (!Array.isArray(value)) {
          throw new Error(`Invalid value for ${path}`);
        }
        normalized[path] = value;
        break;
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
      puzzle: {
        active: source.hidden?.puzzle?.active || false,
        description: source.hidden?.puzzle?.description || '',
        solvedBy: source.hidden?.puzzle?.solvedBy || [],
        // sello is only exposed to admins — stripped below for non-admins
      },
    },
  };

  const dismissed = userId
    ? wizard.urgentMessage.dismissedBy.some((dismissedId) => String(dismissedId) === String(userId))
    : false;

  const puzzleSolved = userId
    ? (source.hidden?.puzzle?.solvedBy || []).some((id) => String(id) === String(userId))
    : false;

  return {
    ...wizard,
    notes: source.notes || [],
    computed: {
      urgentMessage: { dismissed },
      puzzle: {
        active: source.hidden?.puzzle?.active || false,
        solved: puzzleSolved,
      },
    },
  };
}

function buildWizardSystemPrompt(hiddenConfig = {}, notes = [], playerMemory = null) {
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

  if (playerMemory?.entries?.length) {
    const memLines = playerMemory.entries.map((e) => `- ${e.content}`).join('\n');
    promptSections.push(`Memoria especifica de este jugador:\n${memLines}`);
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

  if (hiddenConfig.puzzle?.active && hiddenConfig.puzzle?.description?.trim()) {
    promptSections.push(
      `MODO PUZZLE ACTIVO:\n` +
      `El jugador debe resolver el siguiente enigma antes de poder continuar. Tu rol es ser un juez generoso, no un obstáculo.\n\n` +
      `ENIGMA:\n${hiddenConfig.puzzle.description.trim()}\n\n` +
      `CRITERIO DE EVALUACION — sé flexible y generoso:\n` +
      `- Aceptá respuestas que capturen la esencia o el espíritu correcto, aunque no sean exactas.\n` +
      `- Aceptá sinónimos, paráfrasis, respuestas creativas o argumentos convincentes.\n` +
      `- Si el jugador demuestra que entendió el concepto o la idea central del enigma, consideralo resuelto.\n` +
      `- Si el jugador da una respuesta parcialmente correcta pero razonable, podés aceptarla.\n` +
      `- Si el jugador argumenta de forma inteligente o creativa aunque no sea la respuesta "esperada", valoralo positivamente.\n` +
      `- Solo rechazá respuestas claramente incorrectas, irrelevantes o que no intenten responder el enigma.\n` +
      `- Después de 4 o más intentos fallidos, podés dar una pista más directa.\n\n` +
      `FORMATO OBLIGATORIO — al final de CADA respuesta tuya, en la última línea, sin nada más:\n` +
      `__RESUELTO__ → si la respuesta es correcta, razonable, creativa o suficientemente convincente.\n` +
      `__PENDIENTE__ → solo si la respuesta es claramente incorrecta o no intenta resolver el enigma.\n` +
      `Nunca omitas el token. Nunca lo pongas dentro del cuerpo del mensaje.`,
    );
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

app.post('/api/wizard/puzzle/dismiss', authRequired, async (req, res, next) => {
  try {
    await Wizard.findOneAndUpdate(
      {},
      { $addToSet: { 'hidden.puzzle.solvedBy': req.user.id } },
      { new: true },
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.post('/api/wizard/speak', authRequired, async (req, res, next) => {
  try {
    const wizard = await getWizardDocument();
    const hiddenConfig = wizard.hidden || createWizardDefaults().hidden;

    // Support chat history: array of { role: 'user'|'assistant', content: string }
    const history = Array.isArray(req.body?.history) ? req.body.history : [];
    const userMessage = typeof req.body?.message === 'string' ? req.body.message.trim() : '';

    // --- Sello check (before calling LLM, sello never leaves the server) ---
    const puzzle = hiddenConfig.puzzle;
    if (puzzle?.active && puzzle?.sello?.trim() && userMessage) {
      if (userMessage.toLowerCase() === puzzle.sello.trim().toLowerCase()) {
        await Wizard.findOneAndUpdate(
          {},
          { $addToSet: { 'hidden.puzzle.solvedBy': req.user.id } },
          { new: true },
        );
        return res.json({ text: 'El sello es correcto. Los caminos se abren ante vos.', puzzleSolved: true });
      }
    }

    const playerMemory = await PlayerMemory.findOne({ userId: req.user.id }).lean().catch(() => null);
    const systemPrompt = buildWizardSystemPrompt(hiddenConfig, wizard.notes || [], playerMemory);

    if (!process.env.GROQ_API_KEY && !process.env.ANTHROPIC_API_KEY) {
      return res.json({ text: FALLBACK_WIZARD_SPEECH, puzzleSolved: false });
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

    const defaultGreeting = (puzzle?.active && puzzle?.description?.trim())
      ? `El jugador acaba de encontrar al Mago Oculto y hay un enigma que debe resolver para continuar. Presentate brevemente en personaje y luego planteale el siguiente enigma de forma dramatica y misteriosa, usando exactamente este contenido como base: "${puzzle.description.trim()}". Deja en claro que no puede irse hasta resolverlo. No superes las 80 palabras. Termina con __PENDIENTE__ en la ultima linea.`
      : 'El jugador acaba de encontrar al Mago Oculto. Pronuncia una unica frase breve, memorable y en personaje.';

    const messages = trimmedMessages.length > 0
      ? trimmedMessages
      : [{ role: 'user', content: defaultGreeting }];

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
          max_tokens: 200,
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
          max_tokens: 200,
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
      let rawText;

      if (useGroq) {
        rawText = payload?.choices?.[0]?.message?.content || '';
      } else {
        rawText = extractAnthropicText(payload);
      }

      // --- Puzzle token extraction ---
      let puzzleSolved = false;
      if (puzzle?.active) {
        const lines = rawText.split('\n');
        const lastLine = lines[lines.length - 1]?.trim() || '';
        if (lastLine === '__RESUELTO__') puzzleSolved = true;
        // Strip token from rawText before sanitizing
        rawText = rawText.replace(/__RESUELTO__|__PENDIENTE__/g, '').trim();
      }

      const generatedText = sanitizeWizardSpeech(rawText);

      if (puzzle?.active && puzzleSolved) {
        await Wizard.findOneAndUpdate(
          {},
          { $addToSet: { 'hidden.puzzle.solvedBy': req.user.id } },
          { new: true },
        );
      }

      return res.json({ text: generatedText || FALLBACK_WIZARD_SPEECH, puzzleSolved: puzzle?.active ? puzzleSolved : false });
    } catch (aiError) {
      console.error('[wizard/speak] ERROR:', aiError.message);
      return res.json({ text: FALLBACK_WIZARD_SPEECH, puzzleSolved: false });
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

// ── Player Memory endpoints ──────────────────────────────────────────────────

app.get('/api/players/:userId/memory', authRequired, async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (req.user.role !== 'admin' && String(req.user.id) !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const mem = await PlayerMemory.findOne({ userId }).lean();
    if (!mem) return res.json({ entries: [] });
    if (req.user.role === 'admin') return res.json(mem);
    return res.json({ entries: mem.entries || [] });
  } catch (err) { next(err); }
});

app.post('/api/players/:userId/memory', requireAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const content = String(req.body?.content || '').trim();
    if (!content) return res.status(400).json({ error: 'content is required' });
    const mem = await PlayerMemory.findOneAndUpdate(
      { userId },
      { $push: { entries: { content, source: 'narrator' } } },
      { new: true, upsert: true },
    );
    res.json(mem);
  } catch (err) { next(err); }
});

app.delete('/api/players/:userId/memory/:entryId', requireAdmin, async (req, res, next) => {
  try {
    const { userId, entryId } = req.params;
    await PlayerMemory.findOneAndUpdate(
      { userId },
      { $pull: { entries: { _id: entryId } } },
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

app.post('/api/players/:userId/memory/generate', requireAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const history = Array.isArray(req.body?.history) ? req.body.history : [];
    if (!process.env.GROQ_API_KEY && !process.env.ANTHROPIC_API_KEY) {
      return res.status(422).json({ error: 'No AI provider configured' });
    }

    const conversationText = history
      .map((m) => `${m.role === 'user' ? 'Jugador' : 'Mago'}: ${m.content}`)
      .join('\n');

    const useGroq = !!process.env.GROQ_API_KEY;
    const apiUrl = useGroq
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://api.anthropic.com/v1/messages';
    const apiKey = useGroq ? process.env.GROQ_API_KEY : process.env.ANTHROPIC_API_KEY;

    const genSystemPrompt = 'Sos un asistente de narracion para un juego de rol. Analiza la siguiente conversacion entre un jugador y el Mago IA. Extrae entre 1 y 5 memorias relevantes sobre el jugador: sus motivaciones, sus acciones, sus relaciones, datos de su personaje revelados en la conversacion. Cada memoria debe ser una oracion concisa en tercera persona. Responde SOLO con un JSON valido, sin backticks, sin explicaciones, con este formato exacto: {"memories": ["texto1", "texto2"]}';
    const genUserMsg = `CONVERSACION:\n${conversationText}`;

    let rawBody;
    if (useGroq) {
      const r = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 512,
          temperature: 0.4,
          messages: [{ role: 'system', content: genSystemPrompt }, { role: 'user', content: genUserMsg }],
        }),
      });
      rawBody = await r.text();
      if (!r.ok) throw new Error(`AI error ${r.status}`);
      const payload = JSON.parse(rawBody);
      rawBody = payload?.choices?.[0]?.message?.content || '{}';
    } else {
      const r = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 512,
          temperature: 0.4,
          system: genSystemPrompt,
          messages: [{ role: 'user', content: genUserMsg }],
        }),
      });
      const p = await r.json();
      rawBody = p?.content?.[0]?.text || '{}';
    }

    let memories;
    try {
      const parsed = JSON.parse(rawBody);
      memories = Array.isArray(parsed?.memories) ? parsed.memories.filter(Boolean) : [];
    } catch {
      return res.status(422).json({ error: 'No se pudieron generar memorias', raw: rawBody });
    }

    if (memories.length) {
      await PlayerMemory.findOneAndUpdate(
        { userId },
        { $push: { entries: { $each: memories.map((c) => ({ content: c, source: 'ai_generated' })) } } },
        { upsert: true },
      );
    }

    res.json({ generated: memories });
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

// ── Avatar endpoints ─────────────────────────────────────────────────────────

function buildAvatarSystemPrompt(avatar = {}, playerMemory = null) {
  const parts = [];
  parts.push(`Sos ${avatar.name || 'un Avatar'}, la manifestación espiritual del personaje de este jugador en el Mundo de las Tinieblas.`);
  parts.push('Hablás desde una perspectiva interior, como una voz del alma del jugador. Sos sabio, críptico y empático. Nunca rompés el personaje.');

  if (avatar.lore?.trim()) {
    parts.push(`\nTU HISTORIA:\n${avatar.lore.trim()}`);
  }
  if (avatar.personality?.trim()) {
    parts.push(`\nTU PERSONALIDAD:\n${avatar.personality.trim()}`);
  }
  if (avatar.rulesContext?.trim()) {
    parts.push(`\nCONTEXTO DE REGLAS:\n${avatar.rulesContext.trim()}`);
  }
  if (avatar.characterSnapshot?.trim()) {
    parts.push(`\nESTADO DEL PERSONAJE:\n${avatar.characterSnapshot.trim()}`);
  }
  if (avatar.sessionInstructions?.trim()) {
    parts.push(`\nINSTRUCCIONES DE SESIÓN:\n${avatar.sessionInstructions.trim()}`);
  }
  if (playerMemory?.entries?.length) {
    const memLines = playerMemory.entries.map((e) => `- ${e.content}`).join('\n');
    parts.push(`\nLO QUE RECORDÁS DE ESTE JUGADOR:\n${memLines}`);
  }
  if (avatar.notes?.length) {
    const noteLines = avatar.notes.map((n) => `- ${n.content}`).join('\n');
    parts.push(`\nNOTAS DEL NARRADOR:\n${noteLines}`);
  }

  parts.push('\nRespondé siempre en español rioplatense. Máximo 3 oraciones por respuesta. Sé conciso y evocador.');
  return parts.join('\n');
}

// GET all avatars (admin)
app.get('/api/avatars', requireAdmin, async (_req, res, next) => {
  try {
    const avatars = await Avatar.find().populate('userId', 'username email').lean();
    res.json(avatars);
  } catch (err) { next(err); }
});

// GET avatar by userId (admin or self)
app.get('/api/avatars/:userId', authRequired, async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (req.user.role !== 'admin' && String(req.user.id) !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const avatar = await Avatar.findOne({ userId }).lean();
    if (!avatar) return res.json(null);

    const myId = req.user.id;
    const dismissed = avatar.active?.dismissedBy?.some((id) => String(id) === String(myId));
    return res.json({
      ...avatar,
      active: {
        ...avatar.active,
        dismissed,
      },
    });
  } catch (err) { next(err); }
});

// PUT update avatar config (admin)
app.put('/api/avatars/:userId', requireAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const allowed = ['name', 'colorPrimary', 'colorSecondary', 'personality', 'lore', 'rulesContext', 'sessionInstructions', 'characterSnapshot'];
    const updates = {};
    for (const key of allowed) {
      if (key in req.body) {
        updates[key] = typeof req.body[key] === 'string' ? req.body[key].trim() : req.body[key];
      }
    }
    const avatar = await Avatar.findOneAndUpdate(
      { userId },
      { $set: updates },
      { new: true, upsert: true },
    ).lean();
    res.json(avatar);
  } catch (err) { next(err); }
});

// PUT activate / deactivate avatar for player (admin)
app.put('/api/avatars/:userId/activate', requireAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const isActive = Boolean(req.body?.isActive);
    const message = String(req.body?.message || '').trim();
    const avatar = await Avatar.findOneAndUpdate(
      { userId },
      {
        $set: {
          'active.isActive': isActive,
          'active.message': message,
          'active.dismissedBy': isActive ? [] : undefined,
        },
      },
      { new: true, upsert: true },
    ).lean();
    res.json(avatar);
  } catch (err) { next(err); }
});

// POST dismiss avatar overlay (player)
app.post('/api/avatars/:userId/dismiss', authRequired, async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (req.user.role !== 'admin' && String(req.user.id) !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await Avatar.findOneAndUpdate(
      { userId },
      { $addToSet: { 'active.dismissedBy': req.user.id } },
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST sync character snapshot (player or admin)
app.post('/api/avatars/:userId/sync-character', authRequired, async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (req.user.role !== 'admin' && String(req.user.id) !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const sheet = await CharacterSheet.findOne({ userId }).lean();
    if (!sheet) return res.status(404).json({ error: 'Character sheet not found' });

    // Build a text snapshot of key character fields
    const snap = [
      sheet.characterName ? `Nombre: ${sheet.characterName}` : null,
      sheet.tradition ? `Tradición: ${sheet.tradition}` : null,
      sheet.essence ? `Esencia: ${sheet.essence}` : null,
      sheet.demeanor ? `Conducta: ${sheet.demeanor}` : null,
      sheet.nature ? `Naturaleza: ${sheet.nature}` : null,
      sheet.arete ? `Arete: ${sheet.arete}` : null,
      sheet.quintessence ? `Quintaesencia: ${sheet.quintessence}` : null,
      sheet.paradox ? `Paradoja: ${sheet.paradox}` : null,
    ].filter(Boolean).join(', ');

    const avatar = await Avatar.findOneAndUpdate(
      { userId },
      { $set: { characterSnapshot: snap } },
      { new: true, upsert: true },
    ).lean();
    res.json(avatar);
  } catch (err) { next(err); }
});

// POST speak to avatar (player or admin)
app.post('/api/avatars/:userId/speak', authRequired, async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (req.user.role !== 'admin' && String(req.user.id) !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const avatar = await Avatar.findOne({ userId }).lean();
    const playerMemory = await PlayerMemory.findOne({ userId }).lean().catch(() => null);
    const systemPrompt = buildAvatarSystemPrompt(avatar || { name: 'Avatar' }, playerMemory);

    const history = Array.isArray(req.body?.history) ? req.body.history : [];
    const userMessage = typeof req.body?.message === 'string' ? req.body.message.trim() : '';

    if (!process.env.GROQ_API_KEY && !process.env.ANTHROPIC_API_KEY) {
      return res.json({ text: 'El Avatar contempla en silencio...' });
    }

    const useGroq = !!process.env.GROQ_API_KEY;
    const apiUrl = useGroq
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://api.anthropic.com/v1/messages';
    const apiKey = useGroq ? process.env.GROQ_API_KEY : process.env.ANTHROPIC_API_KEY;

    const rawMessages = [];
    for (const entry of history) {
      if ((entry.role === 'user' || entry.role === 'assistant') && typeof entry.content === 'string') {
        rawMessages.push({ role: entry.role, content: entry.content });
      }
    }
    if (userMessage) rawMessages.push({ role: 'user', content: userMessage });

    const firstUserIdx = rawMessages.findIndex((m) => m.role === 'user');
    const trimmedMessages = firstUserIdx > 0 ? rawMessages.slice(firstUserIdx) : rawMessages;
    const messages = trimmedMessages.length > 0
      ? trimmedMessages
      : [{ role: 'user', content: 'El jugador acaba de invocar al Avatar. Pronuncia una sola frase en personaje.' }];

    try {
      let rawText;
      if (useGroq) {
        const r = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            max_tokens: 200,
            temperature: 0.9,
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
          }),
        });
        const p = JSON.parse(await r.text());
        rawText = p?.choices?.[0]?.message?.content || '';
      } else {
        const r = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 200,
            temperature: 0.9,
            system: systemPrompt,
            messages,
          }),
        });
        const p = await r.json();
        rawText = extractAnthropicText(p);
      }
      return res.json({ text: sanitizeWizardSpeech(rawText) || 'El Avatar contempla en silencio...' });
    } catch (aiError) {
      console.error('[avatar/speak] ERROR:', aiError.message);
      return res.json({ text: 'El Avatar contempla en silencio...' });
    }
  } catch (err) { next(err); }
});

// POST add note to avatar (admin)
app.post('/api/avatars/:userId/notes', requireAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const content = String(req.body?.content || '').trim();
    if (!content) return res.status(400).json({ error: 'content is required' });
    const avatar = await Avatar.findOneAndUpdate(
      { userId },
      { $push: { notes: { content, createdAt: new Date() } } },
      { new: true, upsert: true },
    ).lean();
    res.json(avatar);
  } catch (err) { next(err); }
});

// DELETE note from avatar (admin)
app.delete('/api/avatars/:userId/notes/:noteId', requireAdmin, async (req, res, next) => {
  try {
    const { userId, noteId } = req.params;
    await Avatar.findOneAndUpdate(
      { userId },
      { $pull: { notes: { _id: noteId } } },
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
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
