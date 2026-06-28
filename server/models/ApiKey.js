import mongoose from 'mongoose';

const ApiKeySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  provider: { type: String, enum: ['openai', 'claude', 'gemini', 'groq', 'deepseek'], required: true },
  encrypted: { type: String, required: true },
  iv: { type: String, required: true },
  tag: { type: String, required: true },
  maskedKey: { type: String },
  lastUsedAt: { type: Date },
  lastDeviceLabel: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

ApiKeySchema.index({ userId: 1, provider: 1 }, { unique: true });

export default mongoose.model('ApiKey', ApiKeySchema);
