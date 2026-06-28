import mongoose from 'mongoose';

const SessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, default: 'New Chat' },
  createdAt: { type: Date, default: Date.now },
  totalTokens: { type: Number, default: 0 },
  totalCost: { type: Number, default: 0 },
  budgetLimit: { type: Number, default: 100000 },
});

export default mongoose.model('Session', SessionSchema);
