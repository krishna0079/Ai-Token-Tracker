import Session from '../models/Session.js';

export const createSession = async (userId, title, budgetLimit) => {
  const session = new Session({ userId, title, budgetLimit });
  await session.save();
  return session;
};

export const getSessionsByUser = async (userId) => {
  return Session.find({ userId }).sort({ createdAt: -1 });
};

export const getSessionById = async (sessionId) => {
  return Session.findById(sessionId);
};

export const updateSessionTokens = async (sessionId, additionalTokens, cost) => {
  return Session.findByIdAndUpdate(
    sessionId,
    { 
      $inc: { totalTokens: additionalTokens, totalCost: cost }
    },
    { new: true }
  );
};
