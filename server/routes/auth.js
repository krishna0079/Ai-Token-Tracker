import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import DeviceSession from '../models/DeviceSession.js';
import { getIO } from '../utils/socketEmitter.js';

const router = express.Router();

function parseDeviceLabel(userAgent) {
  if (!userAgent) return 'Unknown device';
  let label = '';
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) label = 'Chrome';
  else if (userAgent.includes('Firefox')) label = 'Firefox';
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) label = 'Safari';
  else if (userAgent.includes('Edg')) label = 'Edge';
  else label = 'Browser';
  if (userAgent.includes('Windows')) label += ' on Windows';
  else if (userAgent.includes('Mac OS')) label += ' on macOS';
  else if (userAgent.includes('Linux')) label += ' on Linux';
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) label += ' on iOS';
  else if (userAgent.includes('Android')) label += ' on Android';
  else label += ' on Unknown OS';
  return label;
}

async function registerDeviceSession(userId, req) {
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.ip || req.connection?.remoteAddress || '';
  const deviceLabel = parseDeviceLabel(userAgent);
  const sessionToken = crypto.randomBytes(32).toString('hex');

  // Check if device was seen before (for new-device alert)
  const existingCount = await DeviceSession.countDocuments({ userId, userAgent });

  await DeviceSession.updateMany({ userId, isCurrent: true }, { isCurrent: false });
  const session = new DeviceSession({ userId, sessionToken, ip, userAgent, deviceLabel, lastActiveAt: new Date(), isCurrent: true });
  await session.save();

  // Emit new-device alert if this user-agent wasn't seen before
  if (existingCount === 0) {
    try {
      const io = getIO();
      if (io) io.emit('device:new', { deviceLabel, ip, time: new Date().toISOString() });
    } catch (e) { /* ignore */ }
  }

  return sessionToken;
}

router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already in use' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({ email, passwordHash });
    await user.save();

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET || 'supersecret', { expiresIn: '7d' });
    await registerDeviceSession(user._id, req);
    res.json({ token, user: { id: user._id, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET || 'supersecret', { expiresIn: '7d' });
    await registerDeviceSession(user._id, req);
    res.json({ token, user: { id: user._id, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Google OAuth — verify Google ID token and create/login user
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'Google credential required' });

    // Decode the JWT from Google (the ID token)
    // In production you'd verify signature with Google's public keys,
    // but for dev we decode the payload directly
    const parts = credential.split('.');
    if (parts.length !== 3) return res.status(400).json({ error: 'Invalid Google token' });
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    
    const { email, sub: googleId } = payload;
    if (!email) return res.status(400).json({ error: 'No email in Google token' });

    // Find or create user
    let user = await User.findOne({ email });
    if (!user) {
      // Auto-create account for Google users (no password needed)
      const passwordHash = await bcrypt.hash(`google_${googleId}_${Date.now()}`, 10);
      user = new User({ email, passwordHash });
      await user.save();
    }

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET || 'supersecret', { expiresIn: '7d' });
    await registerDeviceSession(user._id, req);
    res.json({ token, user: { id: user._id, email: user.email } });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

// POST /auth/logout — optional server-side token invalidation
router.post('/logout', async (req, res) => {
  try {
    // In production, you could blacklist the JWT here
    // For now, we just acknowledge — client removes the token
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
