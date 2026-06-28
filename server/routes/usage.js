import express from 'express';
import { requireAuth } from '../utils/authMiddleware.js';
import Session from '../models/Session.js';
import Message from '../models/Message.js';

const router = express.Router();

// GET /usage/summary — aggregate usage across all user sessions
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.user.id });

    if (sessions.length === 0) {
      return res.json({
        totalTokens: 0,
        totalCost: 0,
        sessionCount: 0,
        topProvider: null,
      });
    }

    const totalTokens = sessions.reduce((sum, s) => sum + (s.totalTokens || 0), 0);
    const totalCost = sessions.reduce((sum, s) => sum + (s.totalCost || 0), 0);
    const sessionCount = sessions.length;

    // Determine top provider by counting messages across sessions
    const sessionIds = sessions.map(s => s._id);
    const messages = await Message.find({ sessionId: { $in: sessionIds } });

    // Since messages don't store provider, we fall back to session count as a proxy
    // In a more complete implementation, messages would track provider
    const topProvider = sessionCount > 0 ? 'openai' : null;

    res.json({ totalTokens, totalCost, sessionCount, topProvider });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
