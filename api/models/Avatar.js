import mongoose from 'mongoose';

const AvatarNoteSchema = new mongoose.Schema({
  content: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
});

const AvatarActiveSchema = new mongoose.Schema({
  isActive: { type: Boolean, default: false },
  message: { type: String, default: '' },
  dismissedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

const AvatarSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    name: { type: String, default: 'Avatar' },
    colorPrimary: { type: String, default: '#a78bfa' },
    colorSecondary: { type: String, default: '#7c3aed' },
    personality: { type: String, default: '' },
    lore: { type: String, default: '' },
    rulesContext: { type: String, default: '' },
    sessionInstructions: { type: String, default: '' },
    characterSnapshot: { type: String, default: '' },
    active: { type: AvatarActiveSchema, default: () => ({}) },
    notes: [AvatarNoteSchema],
  },
  { timestamps: true },
);

export default mongoose.model('Avatar', AvatarSchema);
