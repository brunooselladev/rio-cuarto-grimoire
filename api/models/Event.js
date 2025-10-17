import mongoose from 'mongoose';
const { Schema } = mongoose;

const EventSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  createdBy: {
    type: String,
    default: 'admin',
  },
}, { timestamps: true });

export default mongoose.model('Event', EventSchema);
