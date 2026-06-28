import express from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../utils/authMiddleware.js';
import { encryptKey, decryptKey, maskKey } from '../utils/keyVault.js';
import ApiKey from '../models/ApiKey.js';

const router = express.Router();

const PROVIDERS = ['openai', 'claude', 'gemini', 'deepseek', 'groq'];

const ENV_KEY_MAP = {
  openai: process.env.OPENAI_API_KEY,
  claude: process.env.ANTHROPIC_API_KEY,
  gemini: process.env.GEMINI_API_KEY,
  deepseek: process.env.DEEPSEEK_API_KEY,
  groq: process.env.GROQ_API_KEY,
};

// GET /api-keys/status
router.get('/status', requireAuth, async (req, res) => {
  try {
    const keys = await ApiKey.find({ userId: req.user.id });
    const status = {};
    for (const p of PROVIDERS) {
      const key = keys.find(k => k.provider === p);
      const hasEnvKey = ENV_KEY_MAP[p] && ENV_KEY_MAP[p].length > 0;
      if (key) {
        status[p] = { exists: true, maskedKey: key.maskedKey, lastUsedAt: key.lastUsedAt, lastDeviceLabel: key.lastDeviceLabel, source: 'user' };
      } else if (hasEnvKey) {
        status[p] = { exists: true, maskedKey: null, source: 'env' };
      } else {
        status[p] = { exists: false };
      }
    }
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api-keys — save or update an API key
router.post('/', requireAuth, async (req, res) => {
  try {
    const { provider, apiKey } = req.body;
    if (!PROVIDERS.includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      return res.status(400).json({ error: 'apiKey is required' });
    }

    const { encrypted, iv, tag } = encryptKey(apiKey);
    const maskedKeyValue = maskKey(apiKey);

    await ApiKey.findOneAndUpdate(
      { userId: req.user.id, provider },
      { encrypted, iv, tag, maskedKey: maskedKeyValue },
      { upsert: true, new: true }
    );

    res.json({ success: true, maskedKey: maskedKeyValue });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rate limiter for test endpoint: 5 requests per minute
const testLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many test requests, please try again in a minute.' },
});

// POST /api-keys/test — validate API key with a lightweight call
router.post('/test', requireAuth, testLimiter, async (req, res) => {
  try {
    const { provider, apiKey } = req.body;
    if (!PROVIDERS.includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }
    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({ error: 'apiKey is required' });
    }

    let valid = false;
    let error = null;
    let errorType = null; // 'network' | 'auth' | 'invalid'

    try {
      if (provider === 'openai') {
        const resp = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        valid = resp.ok;
        if (!valid) {
          const body = await resp.json().catch(() => ({}));
          error = body?.error?.message || `HTTP ${resp.status}`;
          errorType = resp.status === 401 ? 'auth' : 'invalid';
        }
      } else if (provider === 'claude') {
        const resp = await fetch('https://api.anthropic.com/v1/models', {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
        });
        valid = resp.ok;
        if (!valid) {
          const body = await resp.json().catch(() => ({}));
          error = body?.error?.message || `HTTP ${resp.status}`;
          errorType = resp.status === 401 ? 'auth' : 'invalid';
        }
      } else if (provider === 'gemini') {
        const encodedKey = encodeURIComponent(apiKey);
        // Try the v1beta endpoint first (supports more key types), then v1 as fallback
        let resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodedKey}`
        );
        if (!resp.ok) {
          // Fallback to v1
          resp = await fetch(
            `https://generativelanguage.googleapis.com/v1/models?key=${encodedKey}`
          );
        }
        valid = resp.ok;
        if (!valid) {
          const body = await resp.json().catch(() => ({}));
          const status = resp.status;
          
          if (body?.error?.message) {
             error = `Google API: ${body.error.message}`;
             errorType = status === 401 || status === 403 ? 'auth' : 'invalid';
          } else if (status === 400) {
            error = 'Invalid API key format. Please check your key.';
            errorType = 'invalid';
          } else if (status === 401 || status === 403) {
            error = 'API key is not authorized. Ensure the Generative Language API is enabled in your GCP project.';
            errorType = 'auth';
          } else {
            error = `HTTP ${status}`;
            errorType = 'invalid';
          }
        }
      } else if (provider === 'groq') {
        const resp = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        valid = resp.ok;
        if (!valid) {
          const body = await resp.json().catch(() => ({}));
          const errMsg = typeof body?.error === 'string' ? body.error : body?.error?.message;
          error = errMsg || `HTTP ${resp.status}`;
          errorType = [400, 401, 403].includes(resp.status) ? 'auth' : 'invalid';
        }
      } else if (provider === 'deepseek') {
        const resp = await fetch('https://api.deepseek.com/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        valid = resp.ok;
        if (!valid) {
          const body = await resp.json().catch(() => ({}));
          const errMsg = typeof body?.error === 'string' ? body.error : body?.error?.message;
          error = errMsg || `HTTP ${resp.status} - Your DeepSeek account may require billing setup to access the API.`;
          errorType = [400, 401, 403].includes(resp.status) ? 'auth' : 'invalid';
        }
      }
    } catch (err) {
      error = `Network error: ${err.message}. Check your connection or firewall.`;
      errorType = 'network';
    }

    res.json(valid ? { valid: true } : { valid: false, error, errorType });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api-keys/:provider — remove an API key
router.delete('/:provider', requireAuth, async (req, res) => {
  try {
    const { provider } = req.params;
    if (!PROVIDERS.includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    const result = await ApiKey.findOneAndDelete({
      userId: req.user.id,
      provider,
    });

    if (!result) {
      return res.status(404).json({ error: 'API key not found' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
