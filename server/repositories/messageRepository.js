import Message from '../models/Message.js';

export const createMessage = async (sessionId, role, text, inputTokens = 0, outputTokens = 0) => {
  const message = new Message({ sessionId, role, text, inputTokens, outputTokens });
  await message.save();
  return message;
};

export const getMessagesBySession = async (sessionId) => {
  return Message.find({ sessionId }).sort({ createdAt: 1 });
};
