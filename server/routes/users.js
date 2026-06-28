import express from 'express';
import { requireAuth } from '../utils/authMiddleware.js';
import User from '../models/User.js';

const router = express.Router();

// GET /users/me — return user profile
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash -__v');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ 
      id: user._id, 
      email: user.email, 
      profileImage: user.profileImage,
      aiAgentIcon: user.aiAgentIcon,
      createdAt: user.createdAt 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /users/me — update email
router.patch('/me', requireAuth, async (req, res) => {
  try {
    const { email, profileImage, aiAgentIcon } = req.body;
    
    let updates = {};
    
    if (email !== undefined) {
      if (typeof email !== 'string') {
        return res.status(400).json({ error: 'Valid email is required' });
      }
      const existing = await User.findOne({ email });
      if (existing && existing._id.toString() !== req.user.id) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      updates.email = email;
    }
    
    if (profileImage !== undefined) {
      updates.profileImage = profileImage;
    }
    
    if (aiAgentIcon !== undefined) {
      updates.aiAgentIcon = aiAgentIcon;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true }
    ).select('-passwordHash -__v');

    res.json({ 
      id: user._id, 
      email: user.email, 
      profileImage: user.profileImage,
      aiAgentIcon: user.aiAgentIcon,
      createdAt: user.createdAt 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /users/me/budget — return default budget limit (placeholder)
router.get('/me/budget', requireAuth, async (req, res) => {
  try {
    res.json({ defaultBudgetLimit: 100000 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /users/me/budget — update default budget (placeholder)
router.patch('/me/budget', requireAuth, async (req, res) => {
  try {
    const { budgetLimit } = req.body;
    if (typeof budgetLimit !== 'number' || budgetLimit < 0) {
      return res.status(400).json({ error: 'Valid budgetLimit is required' });
    }
    // Placeholder: in production, store on user document
    res.json({ defaultBudgetLimit: budgetLimit });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
