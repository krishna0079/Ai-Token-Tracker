import express from 'express';
import crypto from 'crypto';
import { requireAuth } from '../utils/authMiddleware.js';
import DeviceSession from '../models/DeviceSession.js';

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

// POST /devices/register — capture device on login
router.post('/register', requireAuth, async (req, res) => {
  try {
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.ip || req.connection?.remoteAddress || '';
    const deviceLabel = parseDeviceLabel(userAgent);
    const sessionToken = crypto.randomBytes(32).toString('hex');

    // Mark existing current sessions as not current
    await DeviceSession.updateMany(
      { userId: req.user.id, isCurrent: true },
      { isCurrent: false }
    );

    const session = new DeviceSession({
      userId: req.user.id,
      sessionToken,
      ip,
      userAgent,
      deviceLabel,
      lastActiveAt: new Date(),
      isCurrent: true,
    });
    await session.save();

    res.json({ sessionToken, deviceLabel });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /devices — list all devices for user
router.get('/', requireAuth, async (req, res) => {
  try {
    const devices = await DeviceSession.find({ userId: req.user.id })
      .sort({ lastActiveAt: -1 })
      .select('-sessionToken');
    res.json(devices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /devices/:id — revoke a specific device session
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const device = await DeviceSession.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!device) return res.status(404).json({ error: 'Device session not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /devices/revoke-others — revoke all other device sessions
router.post('/revoke-others', requireAuth, async (req, res) => {
  try {
    // Keep current device, delete all others
    const result = await DeviceSession.deleteMany({
      userId: req.user.id,
      isCurrent: { $ne: true },
    });
    res.json({ success: true, revoked: result.deletedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /devices/check-new — check if device is new (for alerting)
router.post('/check-new', requireAuth, async (req, res) => {
  try {
    const userAgent = req.headers['user-agent'] || '';
    const existingCount = await DeviceSession.countDocuments({
      userId: req.user.id,
      userAgent,
    });
    res.json({ isNew: existingCount === 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
