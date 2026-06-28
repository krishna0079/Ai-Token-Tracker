import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import apiKeysRoutes from './routes/apiKeys.js';
import usersRoutes from './routes/users.js';
import usageRoutes from './routes/usage.js';
import deviceRoutes from './routes/devices.js';
import { createMessage } from './repositories/messageRepository.js';
import { updateSessionTokens, getSessionById } from './repositories/sessionRepository.js';
import ApiKey from './models/ApiKey.js';
import Message from './models/Message.js';
import { decryptKey } from './utils/keyVault.js';
import { setIO } from './utils/socketEmitter.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});
setIO(io);

app.use(cors());
app.use(express.json());

// Step 7: Rate limiting — 20 auth requests per 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests, please try again later.' },
});

app.use('/auth', authLimiter, authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/api-keys', apiKeysRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/devices', deviceRoutes);

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication error'));
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET || 'supersecret');
    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

import { streamChatResponse } from './services/aiService.js';
import { normalizeUsage, calculateCost, getCostBreakdown, checkBudgetThreshold } from './utils/usageAdapter.js';
import { getMessagesBySession } from './repositories/messageRepository.js';
import { sanitizeInput, validateMessage } from './utils/sanitize.js';

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.user.email}`);

  // Step 5+6: Chat send → stream → track tokens → cost → budget alert
  socket.on('chat:send', async ({ sessionId, provider = 'openai', model = null, text }) => {
    try {
      const session = await getSessionById(sessionId);
      if (!session || session.userId.toString() !== socket.user.id) {
        return socket.emit('chat:error', 'Invalid session');
      }

      // Validate and sanitize message
      const sanitized = sanitizeInput(text || '');
      const validation = validateMessage(sanitized);
      if (!validation.valid) {
        return socket.emit('chat:error', validation.error);
      }

      // Look up user's stored API key for the selected provider
      let userApiKey = null;
      try {
        const storedKey = await ApiKey.findOne({ userId: socket.user.id, provider });
        if (storedKey) {
          userApiKey = decryptKey(storedKey);
          // Track last used time
          await ApiKey.findByIdAndUpdate(storedKey._id, { lastUsedAt: new Date(), lastDeviceLabel: socket.handshake?.headers?.['user-agent'] ? 'Socket connection' : '' });
        }
      } catch (keyErr) {
        console.error('Failed to decrypt user API key, falling back to env:', keyErr.message);
      }

      await createMessage(sessionId, 'user', sanitized);
      const messagesDb = await getMessagesBySession(sessionId);
      const messages = messagesDb.map(m => ({ role: m.role, text: m.text }));

      // Pre-check: API key must be available
      const envKey = process.env[`${provider.toUpperCase()}_API_KEY`];
      if (!userApiKey && !envKey) {
        socket.emit('chat:error', `No ${provider} API key found. Add one in Settings or set ${provider.toUpperCase()}_API_KEY in server .env`);
        return;
      }

      socket.emit('chat:stream_start');

      await streamChatResponse({
        provider,
        messages,
        apiKey: userApiKey,
        onChunk: (chunk) => {
          socket.emit('chat:stream_chunk', chunk);
        },
        onComplete: async (fullText, rawUsage) => {
          socket.emit('chat:stream_end');

          // Step 5: Normalize usage and calculate cost with per-model pricing
          const usage = normalizeUsage(provider, rawUsage);
          const breakdown = getCostBreakdown(provider, model, usage.inputTokens, usage.outputTokens);

          await createMessage(sessionId, 'assistant', fullText, usage.inputTokens, usage.outputTokens);

          const updatedSession = await updateSessionTokens(
            sessionId,
            usage.inputTokens + usage.outputTokens,
            breakdown.totalCost
          );

          // Step 5: Emit full usage breakdown including per-message cost details
          socket.emit('usage:update', {
            totalTokens: updatedSession.totalTokens,
            totalCost: updatedSession.totalCost,
            lastMessage: {
              inputTokens: usage.inputTokens,
              outputTokens: usage.outputTokens,
              inputCost: breakdown.inputCost,
              outputCost: breakdown.outputCost,
              totalCost: breakdown.totalCost,
              provider,
              model: model || `${provider} default`,
            }
          });

          // Step 6: Check budget threshold and emit alert if needed
          const alertLevel = checkBudgetThreshold(updatedSession.totalTokens, session.budgetLimit);
          if (alertLevel) {
            socket.emit('budget:warning', alertLevel);
          }
        },
        onError: (err) => {
          console.error('AI Service error:', {
            message: err.message,
            status: err.status,
            code: err.code,
            stack: err.stack?.split('\n').slice(0,3).join('\n'),
            responseData: err.response?.data
          });
          socket.emit('chat:error', 'AI Service Error: ' + err.message);
        }
      });

    } catch (err) {
      socket.emit('chat:error', err.message);
    }
  });

  // Step 6: Regenerate last assistant message
  socket.on('message:regenerate', async ({ sessionId, messageId }) => {
    try {
      const session = await getSessionById(sessionId);
      if (!session || session.userId.toString() !== socket.user.id) {
        return socket.emit('chat:error', 'Invalid session');
      }

      const messages = await getMessagesBySession(sessionId);
      if (messages.length < 2) {
        return socket.emit('chat:error', 'Not enough messages to regenerate');
      }

      // Remove the last assistant message
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role !== 'assistant') {
        return socket.emit('chat:error', 'Last message is not an assistant response');
      }

      await Message.findByIdAndDelete(lastMsg._id);

      // Re-emit chat:send with the same context but without the last assistant message
      const userMessages = messages.slice(0, -1).map(m => ({ role: m.role, text: m.text }));

      // Look up user's stored API key for the default provider
      let userApiKey = null;
      try {
        const storedKey = await ApiKey.findOne({ userId: socket.user.id, provider: 'openai' });
        if (storedKey) {
          userApiKey = decryptKey(storedKey);
        }
      } catch (keyErr) {
        console.error('Failed to decrypt user API key for regenerate, falling back to env:', keyErr.message);
      }

      socket.emit('chat:stream_start');

      await streamChatResponse({
        provider: 'openai',
        messages: userMessages,
        apiKey: userApiKey,
        onChunk: (chunk) => {
          socket.emit('chat:stream_chunk', chunk);
        },
        onComplete: async (fullText, rawUsage) => {
          socket.emit('chat:stream_end');

          const usage = normalizeUsage('openai', rawUsage);
          const breakdown = getCostBreakdown('openai', null, usage.inputTokens, usage.outputTokens);

          await createMessage(sessionId, 'assistant', fullText, usage.inputTokens, usage.outputTokens);

          const updatedSession = await updateSessionTokens(
            sessionId,
            usage.inputTokens + usage.outputTokens,
            breakdown.totalCost
          );

          socket.emit('usage:update', {
            totalTokens: updatedSession.totalTokens,
            totalCost: updatedSession.totalCost,
            lastMessage: {
              inputTokens: usage.inputTokens,
              outputTokens: usage.outputTokens,
              inputCost: breakdown.inputCost,
              outputCost: breakdown.outputCost,
              totalCost: breakdown.totalCost,
              provider: 'openai',
              model: 'openai default',
            }
          });

          const alertLevel = checkBudgetThreshold(updatedSession.totalTokens, session.budgetLimit);
          if (alertLevel) {
            socket.emit('budget:warning', alertLevel);
          }
        },
        onError: (err) => {
          console.error('AI Service error (regenerate):', { message: err.message, status: err.status, code: err.code, responseData: err.response?.data });
          socket.emit('chat:error', 'AI Service Error: ' + err.message);
        }
      });

    } catch (err) {
      socket.emit('chat:error', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.user.email}`);
  });
});

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai-token-monitor';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error('MongoDB connection error:', err));
