import express from 'express';
import { authRequired } from '../lib/auth.js';
import AdminNote from '../models/AdminNote.js';

const router = express.Router();

// GET /api/notes/:playerId - Get all notes for a player (admin only)
router.get('/:playerId', authRequired, async (req, res) => {
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

// POST /api/notes - Create a new note for a player (admin only)
router.post('/', authRequired, async (req, res) => {
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

export default router;
