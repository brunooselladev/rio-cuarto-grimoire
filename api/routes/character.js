import express from 'express';
import { authRequired } from '../lib/auth.js';
import CharacterSheet from '../models/CharacterSheet.js';

const router = express.Router();

// GET /api/character/me - Get the character sheet for the logged-in user
router.get('/me', authRequired, async (req, res) => {
  try {
    let sheet = await CharacterSheet.findOne({ user: req.user.id });

    if (!sheet) {
      // If no sheet exists, create a new one for the user
      sheet = new CharacterSheet({ user: req.user.id });
      await sheet.save();
    }

    res.json(sheet);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// POST /api/character - Create or update a character sheet
router.post('/', authRequired, async (req, res) => {
  const { ...sheetData } = req.body;

  try {
    let sheet = await CharacterSheet.findOne({ user: req.user.id });

    if (sheet) {
      // Update existing sheet
      sheet = await CharacterSheet.findOneAndUpdate(
        { user: req.user.id },
        { $set: sheetData },
        { new: true }
      );
      return res.json(sheet);
    }

    // Create new sheet
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

export default router;
