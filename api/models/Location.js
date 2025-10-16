import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    narration: {
      type: String,
      default: '',
    },
    sphere: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      default: '',
    },
    lat: {
      type: Number,
      required: true,
    },
    lng: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ['power', 'mission', 'refuge', 'danger'],
      default: 'power',
    },
    visible: {
      type: Boolean,
      default: true,
    },
    images: {
      type: [String],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Location || mongoose.model('Location', locationSchema);
