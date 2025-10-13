import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'user'], default: 'admin' },
  },
  { timestamps: true },
);

UserSchema.index({ username: 1 }, { unique: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);