import mongoose from 'mongoose';

const DeviceSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sessionToken: { type: String, required: true, unique: true },
  ip: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  deviceLabel: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  lastActiveAt: { type: Date, default: Date.now },
  isCurrent: { type: Boolean, default: false },
});

DeviceSessionSchema.index({ userId: 1, lastActiveAt: -1 });

export default mongoose.model('DeviceSession', DeviceSessionSchema);
