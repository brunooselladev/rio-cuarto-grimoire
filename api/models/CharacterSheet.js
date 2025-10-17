import mongoose from 'mongoose';
const { Schema } = mongoose;

const CharacterSheetSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name: { type: String, default: '' },
  player: { type: String, default: '' },
  chronicle: { type: String, default: '' },
  nature: { type: String, default: '' },
  demeanor: { type: String, default: '' },
  concept: { type: String, default: '' },
  essence: { type: String, default: '' },
  tradition: { type: String, default: '' },
  cabal: { type: String, default: '' },

  attributes: {
    physical: {
      strength: { type: Number, default: 1 },
      dexterity: { type: Number, default: 1 },
      stamina: { type: Number, default: 1 },
    },
    social: {
      charisma: { type: Number, default: 1 },
      manipulation: { type: Number, default: 1 },
      appearance: { type: Number, default: 1 },
    },
    mental: {
      perception: { type: Number, default: 1 },
      intelligence: { type: Number, default: 1 },
      wits: { type: Number, default: 1 },
    },
  },

  abilities: {
    talents: {
      alertness: { type: Number, default: 0 },
      art: { type: Number, default: 0 },
      athletics: { type: Number, default: 0 },
      awareness: { type: Number, default: 0 },
      brawl: { type: Number, default: 0 },
      empathy: { type: Number, default: 0 },
      expression: { type: Number, default: 0 },
      intimidation: { type: Number, default: 0 },
      leadership: { type: Number, default: 0 },
      streetwise: { type: Number, default: 0 },
      subterfuge: { type: Number, default: 0 },
    },
    skills: {
      crafts: { type: Number, default: 0 },
      drive: { type: Number, default: 0 },
      etiquette: { type: Number, default: 0 },
      firearms: { type: Number, default: 0 },
      larceny: { type: Number, default: 0 },
      meditation: { type: Number, default: 0 },
      melee: { type: Number, default: 0 },
      performance: { type: Number, default: 0 },
      stealth: { type: Number, default: 0 },
      survival: { type: Number, default: 0 },
      technology: { type: Number, default: 0 },
    },
    knowledges: {
      academics: { type: Number, default: 0 },
      computer: { type: Number, default: 0 },
      cosmology: { type: Number, default: 0 },
      enigmas: { type: Number, default: 0 },
      investigation: { type: Number, default: 0 },
      law: { type: Number, default: 0 },
      medicine: { type: Number, default: 0 },
      occult: { type: Number, default: 0 },
      politics: { type: Number, default: 0 },
      science: { type: Number, default: 0 },
    },
  },

  spheres: {
    correspondence: { type: Number, default: 0 },
    entropy: { type: Number, default: 0 },
    forces: { type: Number, default: 0 },
    life: { type: Number, default: 0 },
    matter: { type: Number, default: 0 },
    mind: { type: Number, default: 0 },
    prime: { type: Number, default: 0 },
    spirit: { type: Number, default: 0 },
    time: { type: Number, default: 0 },
  },

  advantages: {
    backgrounds: [{ name: { type: String }, value: { type: Number } }],
    arete: { type: Number, default: 1 },
    willpower: { type: Number, default: 1 },
    quintessence: { type: Number, default: 0 },
    paradox: { type: Number, default: 0 },
  },

  health: {
    bruised: { type: Boolean, default: false },
    hurt: { type: Boolean, default: false },
    injured: { type: Boolean, default: false },
    wounded: { type: Boolean, default: false },
    mauled: { type: Boolean, default: false },
    crippled: { type: Boolean, default: false },
    incapacitated: { type: Boolean, default: false },
  },

  experience: { type: Number, default: 0 },

}, { timestamps: true });

export default mongoose.model('CharacterSheet', CharacterSheetSchema);
