import mongoose from 'mongoose';
const { Schema } = mongoose;

const AdminNoteSchema = new Schema({
  player: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  admin: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model('AdminNote', AdminNoteSchema);
