import mongoose from 'mongoose';

export const WIZARD_LOCATIONS = ['map', 'panel', 'character', 'events'];
export const WIZARD_MODES = ['topics', 'examples', 'full_prompt'];

export function createWizardDefaults() {
  return {
    urgentMessage: {
      active: false,
      text: '',
      dismissedBy: [],
    },
    hidden: {
      active: false,
      location: 'map',
      mode: 'topics',
      topics: [],
      examplePhrases: [],
      systemPrompt: '',
    },
  };
}

const UrgentMessageSchema = new mongoose.Schema(
  {
    active: { type: Boolean, default: false },
    text: { type: String, default: '', trim: true },
    dismissedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { _id: false },
);

const HiddenWizardSchema = new mongoose.Schema(
  {
    active: { type: Boolean, default: false },
    location: { type: String, enum: WIZARD_LOCATIONS, default: 'map' },
    mode: { type: String, enum: WIZARD_MODES, default: 'topics' },
    topics: [{ type: String, trim: true }],
    examplePhrases: [{ type: String, trim: true }],
    systemPrompt: { type: String, default: '', trim: true },
  },
  { _id: false },
);

const WizardSchema = new mongoose.Schema(
  {
    urgentMessage: { type: UrgentMessageSchema, default: () => ({}) },
    hidden: { type: HiddenWizardSchema, default: () => ({}) },
  },
  { timestamps: true },
);

export default mongoose.models.Wizard || mongoose.model('Wizard', WizardSchema);
