import mongoose from 'mongoose';

const PlayerMemoryEntrySchema = new mongoose.Schema({
  content: { type: String, required: true, trim: true },
  source: { type: String, enum: ['narrator', 'ai_generated'], default: 'narrator' },
  createdAt: { type: Date, default: Date.now },
});

const PlayerMemorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    entries: [PlayerMemoryEntrySchema],
  },
  { timestamps: true },
);

export default mongoose.model('PlayerMemory', PlayerMemorySchema);
