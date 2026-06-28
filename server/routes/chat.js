import express from 'express';
import { requireAuth } from '../utils/authMiddleware.js';
import { getSessionsByUser, getSessionById, createSession, updateSessionTokens } from '../repositories/sessionRepository.js';
import { getMessagesBySession, createMessage } from '../repositories/messageRepository.js';
import { sendChatMessage } from '../services/aiService.js';
import ApiKey from '../models/ApiKey.js';
import { decryptKey } from '../utils/keyVault.js';
import { normalizeUsage, getCostBreakdown } from '../utils/usageAdapter.js';
import { sanitizeInput, validateMessage } from '../utils/sanitize.js';
import Session from '../models/Session.js';
import Message from '../models/Message.js';

const router = express.Router();

router.get('/sessions', requireAuth, async (req, res) => {
  try {
    const sessions = await getSessionsByUser(req.user.id);
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions', requireAuth, async (req, res) => {
  try {
    const { title, budgetLimit } = req.body;
    const session = await createSession(req.user.id, title || 'New Chat', budgetLimit || 100000);
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions/:id', requireAuth, async (req, res) => {
  try {
    const session = await getSessionById(req.params.id);
    if (!session || session.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    const messages = await getMessagesBySession(req.params.id);
    res.json({ session, messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /sessions/:id — update session title
router.patch('/sessions/:id', requireAuth, async (req, res) => {
  try {
    const session = await getSessionById(req.params.id);
    if (!session || session.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { title } = req.body;
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Valid title is required' });
    }

    const updated = await Session.findByIdAndUpdate(
      req.params.id,
      { title },
      { new: true }
    );
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /sessions/:id — delete session and its messages
router.delete('/sessions/:id', requireAuth, async (req, res) => {
  try {
    const session = await getSessionById(req.params.id);
    if (!session || session.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await Message.deleteMany({ sessionId: req.params.id });
    await Session.findByIdAndDelete(req.params.id);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /sessions/:id/duplicate — clone session + messages
router.post('/sessions/:id/duplicate', requireAuth, async (req, res) => {
  try {
    const session = await getSessionById(req.params.id);
    if (!session || session.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const newSession = await createSession(
      req.user.id,
      `${session.title} (copy)`,
      session.budgetLimit
    );

    const messages = await getMessagesBySession(req.params.id);
    if (messages.length > 0) {
      const cloned = messages.map(m => ({
        sessionId: newSession._id,
        role: m.role,
        text: m.text,
        inputTokens: m.inputTokens,
        outputTokens: m.outputTokens,
        createdAt: m.createdAt,
      }));
      await Message.insertMany(cloned);
    }

    // Copy token/cost totals
    await Session.findByIdAndUpdate(newSession._id, {
      totalTokens: session.totalTokens,
      totalCost: session.totalCost,
    });

    const result = await getSessionById(newSession._id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /sessions/:id/export?format=md — export chat as markdown
router.get('/sessions/:id/export', requireAuth, async (req, res) => {
  try {
    const session = await getSessionById(req.params.id);
    if (!session || session.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const messages = await getMessagesBySession(req.params.id);
    const format = req.query.format || 'md';

    if (format !== 'md') {
      return res.status(400).json({ error: 'Only md format is supported' });
    }

    let md = `# ${session.title}\n\n`;
    md += `*Created: ${session.createdAt.toISOString()}*\n`;
    md += `*Tokens: ${session.totalTokens} | Cost: $${session.totalCost.toFixed(4)}*\n\n---\n\n`;

    for (const msg of messages) {
      const label = msg.role === 'user' ? '**User**' : '**Assistant**';
      md += `${label}\n\n${msg.text}\n\n---\n\n`;
    }

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${session.title}.md"`);
    res.send(md);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/chat/messages — REST fallback for sending a message (non-streaming)
router.post('/messages', requireAuth, async (req, res) => {
  try {
    const { sessionId, provider = 'openai', text, fileData, fileName } = req.body;

    // Validate session
    const session = await getSessionById(sessionId);
    if (!session || session.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Validate and sanitize message
    const sanitized = sanitizeInput(text || '');
    const validation = validateMessage(sanitized);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Save user message
    await createMessage(sessionId, 'user', sanitized);

    // Build conversation history
    const messagesDb = await getMessagesBySession(sessionId);
    const messages = messagesDb.map(m => ({ role: m.role, text: m.text }));

    // Look up user's stored API key
    let userApiKey = null;
    try {
      const storedKey = await ApiKey.findOne({ userId: req.user.id, provider });
      if (storedKey) {
        userApiKey = decryptKey(storedKey);
        await ApiKey.findByIdAndUpdate(storedKey._id, { lastUsedAt: new Date() });
      }
    } catch (keyErr) {
      console.error('Failed to decrypt user API key, falling back to env:', keyErr.message);
    }

    // Call AI service
    const { text: replyText, usage: rawUsage } = await sendChatMessage({
      provider,
      messages,
      apiKey: userApiKey,
    });

    const usage = normalizeUsage(provider, rawUsage);
    const breakdown = getCostBreakdown(provider, null, usage.inputTokens, usage.outputTokens);

    // Save assistant message
    await createMessage(sessionId, 'assistant', replyText, usage.inputTokens, usage.outputTokens);

    // Update session totals
    const updatedSession = await updateSessionTokens(
      sessionId,
      usage.inputTokens + usage.outputTokens,
      breakdown.totalCost
    );

    res.json({
      message: { role: 'assistant', text: replyText, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens },
      usage: {
        totalTokens: updatedSession.totalTokens,
        totalCost: updatedSession.totalCost,
        lastMessage: {
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          inputCost: breakdown.inputCost,
          outputCost: breakdown.outputCost,
          totalCost: breakdown.totalCost,
          provider,
        },
      },
    });
  } catch (error) {
    console.error('REST chat error:', error);
    res.status(500).json({ error: error.message || 'AI Service Error' });
  }
});

export default router;

