import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { cn } from '../lib/utils';
import clsx from 'clsx';
import {
  ArrowLeft,
  User,
  Key,
  DollarSign,
  Palette,
  Save,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  Sun,
  Moon,
  Monitor,
  Smartphone,
  Laptop,
  Globe,
  LogOut,
  AlertTriangle,
  Sparkles,
  Cpu,
  Image as ImageIcon,
  Bot
} from 'lucide-react';

import { useSettings } from '../contexts/SettingsContext';

const TABS = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'apikeys', label: 'API Keys', icon: Key },
  { id: 'devices', label: 'Devices', icon: Monitor },
  { id: 'budget', label: 'Budget & Alerts', icon: DollarSign },
  { id: 'appearance', label: 'Appearance', icon: Palette },
];

const PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    color: 'from-green-500 to-emerald-600',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    text: 'text-green-400',
    prefix: 'sk-',
  },
  {
    id: 'claude',
    name: 'Claude',
    color: 'from-orange-500 to-amber-600',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    text: 'text-orange-400',
    prefix: 'sk-ant-',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    color: 'from-blue-500 to-cyan-600',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    text: 'text-blue-400',
    prefix: 'AI',
  },
  {
    id: 'groq',
    name: 'Groq',
    color: 'from-purple-600 to-violet-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    text: 'text-purple-400',
    prefix: 'gsk_',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    color: 'from-indigo-500 to-purple-600',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
    text: 'text-indigo-400',
    prefix: 'sk-',
  },
];

// ─── Provider Key Card ───────────────────────────────────────────────
function ProviderKeyCard({ provider, existingKey, lastUsedAt, lastDeviceLabel, onSaved, onRemoved }) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // 'success' | 'error' | null
  const [testErrorMsg, setTestErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [removing, setRemoving] = useState(false);

  const handleTestKey = async () => {
    if (!apiKey.trim()) return;
    setTesting(true);
    setTestResult(null);
    setTestErrorMsg('');
    try {
      const { data } = await api.post('/api/api-keys/test', { provider: provider.id, apiKey: apiKey.trim() });
      if (data.valid) {
        setTestResult('success');
      } else {
        setTestResult('error');
        setTestErrorMsg(data.error || 'Validation failed. Please check the key.');
      }
    } catch (err) {
      setTestResult('error');
      if (err.code === 'ERR_NETWORK' || !err.response) {
        setTestErrorMsg('Network error — unable to reach the server.');
      } else {
        setTestErrorMsg(err.response?.data?.error || 'An unexpected error occurred.');
      }
    } finally {
      setTesting(false);
    }
  };

  const handleSaveKey = async () => {
    if (!apiKey.trim()) return;
    setSaving(true);
    setSaveError('');
    try {
      await api.post('/api/api-keys', { provider: provider.id, apiKey: apiKey.trim() });
      setApiKey('');
      setTestResult(null);
      onSaved?.();
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to save key';
      setSaveError(msg);
      console.error('Failed to save key', err);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveKey = async () => {
    setRemoving(true);
    try {
      await api.delete(`/api/api-keys/${provider.id}`);
      onRemoved?.();
    } catch (err) {
      console.error('Failed to remove key', err);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className={cn(
            'w-10 h-10 rounded-xl bg-gradient-to-tr flex items-center justify-center text-white font-display font-bold text-sm shadow-lg',
            provider.color
          )}
        >
          {provider.name.charAt(0)}
        </div>
        <div className="flex-1">
          <h4 className="font-display font-semibold text-slate-200">{provider.name}</h4>
          <p className="text-[11px] text-slate-500">API Key</p>
        </div>
        {existingKey && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] text-emerald-400 font-medium">Connected</span>
          </div>
        )}
      </div>

      {/* Key exists → show masked */}
      {existingKey ? (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex-1 px-3 py-2 rounded-lg border font-mono text-sm',
                provider.bg,
                provider.border,
                provider.text
              )}
            >
              {existingKey}
            </div>
            <Button
              onClick={handleRemoveKey}
              disabled={removing}
              className="px-3 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 text-sm"
            >
              {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              <span className="ml-1.5">Remove</span>
            </Button>
          </div>
          {lastUsedAt && (
            <p className="text-[11px] text-slate-500 ml-1">
              Last used: {lastDeviceLabel || 'Unknown device'},{' '}
              {(() => {
                const diff = Date.now() - new Date(lastUsedAt).getTime();
                const mins = Math.floor(diff / 60000);
                if (mins < 1) return 'just now';
                if (mins < 60) return `${mins}m ago`;
                const hrs = Math.floor(mins / 60);
                if (hrs < 24) return `${hrs}h ago`;
                const days = Math.floor(hrs / 24);
                return `${days}d ago`;
              })()}
            </p>
          )}
        </div>
      ) : (
        /* Key doesn't exist → input + test + save */
        <div className="space-y-3">
          <div className="relative">
            <Input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setTestResult(null);
              }}
              placeholder={`${provider.prefix}••••••••••••`}
              className="bg-slate-900/50 border-white/10 text-slate-200 placeholder:text-slate-600 pr-10 font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Test result inline */}
          {testResult && (
            <div
              className={clsx(
                'flex items-start gap-2 text-sm px-3 py-2 rounded-lg',
                testResult === 'success'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              )}
            >
              {testResult === 'success' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> 
                  <span>Key is valid — ready to save!</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{testErrorMsg}</span>
                </>
              )}
            </div>
          )}

          {saveError && (
            <div className="flex items-start gap-2 text-sm px-3 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
              <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleTestKey}
              disabled={!apiKey.trim() || testing}
              className="flex-1 px-3 py-2 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10 text-sm disabled:opacity-40"
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  Validating…
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 mr-1.5" />
                  Test Key
                </>
              )}
            </Button>
            <Button
              onClick={handleSaveKey}
              disabled={!apiKey.trim() || saving}
              className="flex-1 px-3 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-500 text-sm disabled:opacity-40"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
              Save Key
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Account Tab ─────────────────────────────────────────────────────
function AccountTab() {
  const [email, setEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  const { profileImage, updateProfileImage } = useSettings();
  const [newProfileImage, setNewProfileImage] = useState('');
  const [savingImage, setSavingImage] = useState(false);
  const [savedImage, setSavedImage] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await api.get('/api/users/me');
        setEmail(data.email || '');
        setNewEmail(data.email || '');
      } catch (err) {
        console.error('Failed to load user', err);
      }
    };
    fetchUser();
    setNewProfileImage(profileImage);
  }, [profileImage]);

  const handleSaveEmail = async () => {
    if (!newEmail.trim() || newEmail === email) return;
    setSaving(true);
    try {
      await api.patch('/api/users/me', { email: newEmail.trim() });
      setEmail(newEmail.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to update email', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display font-semibold text-lg text-slate-200 mb-1">Account Settings</h3>
        <p className="text-sm text-slate-500">Manage your account details.</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm space-y-4">
        <div>
          <Label className="text-slate-400 text-xs uppercase tracking-wider">Current Email</Label>
          <p className="text-slate-200 mt-1 font-mono text-sm">{email || '—'}</p>
        </div>

        <div className="border-t border-white/5 pt-4 space-y-3">
          <Label className="text-slate-400 text-xs uppercase tracking-wider">Update Email</Label>
          <Input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="you@example.com"
            className="bg-slate-900/50 border-white/10 text-slate-200 placeholder:text-slate-600"
          />
          <Button
            onClick={handleSaveEmail}
            disabled={saving || !newEmail.trim() || newEmail === email}
            className="px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-500 text-sm disabled:opacity-40"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
            ) : saved ? (
              <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-400" />
            ) : (
              <Save className="w-4 h-4 mr-1.5" />
            )}
            {saved ? 'Saved!' : 'Save Changes'}
          </Button>
        </div>

        <div className="border-t border-white/5 pt-4 space-y-3">
          <Label className="text-slate-400 text-xs uppercase tracking-wider">Profile Image URL</Label>
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-violet-500 to-fuchsia-600 flex items-center justify-center overflow-hidden flex-shrink-0">
              {profileImage ? (
                <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-white" />
              )}
            </div>
            <p className="text-xs text-slate-500 flex-1">Provide a direct URL to an image to update your profile picture. Leave blank to revert to the default avatar.</p>
          </div>
          <Input
            type="url"
            value={newProfileImage}
            onChange={(e) => setNewProfileImage(e.target.value)}
            placeholder="https://example.com/avatar.png"
            className="bg-slate-900/50 border-white/10 text-slate-200 placeholder:text-slate-600"
          />
          <Button
            onClick={async () => {
              if (newProfileImage === profileImage) return;
              setSavingImage(true);
              const success = await updateProfileImage(newProfileImage.trim());
              setSavingImage(false);
              if (success) {
                setSavedImage(true);
                setTimeout(() => setSavedImage(false), 2000);
              }
            }}
            disabled={savingImage || newProfileImage === profileImage}
            className="px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-500 text-sm disabled:opacity-40"
          >
            {savingImage ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
            ) : savedImage ? (
              <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-400" />
            ) : (
              <Save className="w-4 h-4 mr-1.5" />
            )}
            {savedImage ? 'Saved!' : 'Save Avatar'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── API Keys Tab ────────────────────────────────────────────────────
function ApiKeysTab() {
  const [keyStatus, setKeyStatus] = useState({});

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/api/api-keys/status');
      setKeyStatus(data);
    } catch (err) {
      console.error('Failed to load key status', err);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display font-semibold text-lg text-slate-200 mb-1">Bring Your Own Key</h3>
        <p className="text-sm text-slate-500">
          Add your own API keys for each provider. Keys are encrypted at rest and never stored in plain text.
        </p>
      </div>

      <div className="space-y-4">
        {PROVIDERS.map((provider) => (
          <ProviderKeyCard
            key={provider.id}
            provider={provider}
            existingKey={keyStatus[provider.id]?.maskedKey || null}
            lastUsedAt={keyStatus[provider.id]?.lastUsedAt}
            lastDeviceLabel={keyStatus[provider.id]?.lastDeviceLabel}
            onSaved={fetchStatus}
            onRemoved={fetchStatus}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Budget & Alerts Tab ─────────────────────────────────────────────
function BudgetTab() {
  const [budgetLimit, setBudgetLimit] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchBudget = async () => {
      try {
        const { data } = await api.get('/api/users/me/budget');
        setBudgetLimit(data.defaultBudgetLimit?.toString() || '100000');
      } catch (err) {
        console.error('Failed to load budget', err);
      }
    };
    fetchBudget();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/api/users/me/budget', { budgetLimit: parseInt(budgetLimit, 10) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save budget', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display font-semibold text-lg text-slate-200 mb-1">Budget & Alerts</h3>
        <p className="text-sm text-slate-500">Set default token budget limits for new sessions.</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm space-y-4">
        <div>
          <Label className="text-slate-400 text-xs uppercase tracking-wider">Default Budget Limit (tokens)</Label>
          <p className="text-[11px] text-slate-600 mt-0.5 mb-2">
            This limit applies to new sessions. Existing sessions keep their current budget.
          </p>
          <Input
            type="number"
            value={budgetLimit}
            onChange={(e) => setBudgetLimit(e.target.value)}
            placeholder="100000"
            className="bg-slate-900/50 border-white/10 text-slate-200 placeholder:text-slate-600 max-w-xs"
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={saving || !budgetLimit}
          className="px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-500 text-sm disabled:opacity-40"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
          ) : saved ? (
            <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-400" />
          ) : (
            <Save className="w-4 h-4 mr-1.5" />
          )}
          {saved ? 'Saved!' : 'Save Budget'}
        </Button>
      </div>
    </div>
  );
}

// ─── Appearance Tab ──────────────────────────────────────────────────
function AppearanceTab() {
  const { theme, setTheme, aiAgentIcon, updateAiAgentIcon } = useSettings();
  const [savingIcon, setSavingIcon] = useState(false);

  const themes = [
    { id: 'dark', label: 'Dark', icon: Moon, description: 'Default dark theme' },
    { id: 'light', label: 'Light', icon: Sun, description: 'Light mode (coming soon)' },
    { id: 'system', label: 'System', icon: Monitor, description: 'Follow system preference' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display font-semibold text-lg text-slate-200 mb-1">Appearance</h3>
        <p className="text-sm text-slate-500">Customize the look and feel of the application.</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
        <Label className="text-slate-400 text-xs uppercase tracking-wider mb-4 block">Theme</Label>
        <div className="grid grid-cols-3 gap-3">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={clsx(
                'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                theme === t.id
                  ? 'bg-violet-600/20 border-violet-500/40 text-violet-300'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-300'
              )}
            >
              <t.icon className="w-5 h-5" />
              <span className="text-sm font-medium">{t.label}</span>
              <span className="text-[10px] text-slate-500 text-center">{t.description}</span>
            </button>
          ))}
        </div>

        <div className="mt-8 border-t border-white/5 pt-6">
          <Label className="text-slate-400 text-xs uppercase tracking-wider mb-4 block">AI Agent Icon</Label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'bot', label: 'Classic Bot', icon: Bot },
              { id: 'sparkles', label: 'Sparkles', icon: Sparkles },
              { id: 'cpu', label: 'AI Processor', icon: Cpu }
            ].map((t) => (
              <button
                key={t.id}
                onClick={async () => {
                  if (aiAgentIcon === t.id) return;
                  setSavingIcon(true);
                  await updateAiAgentIcon(t.id);
                  setSavingIcon(false);
                }}
                disabled={savingIcon}
                className={clsx(
                  'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                  aiAgentIcon === t.id
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-300 disabled:opacity-50'
                )}
              >
                <t.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Connected Devices Tab ───────────────────────────────────────────
function DevicesTab() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(null);
  const [msg, setMsg] = useState('');

  const fetchDevices = useCallback(async () => {
    try {
      const { data } = await api.get('/api/devices');
      setDevices(data);
    } catch (err) {
      console.error('Failed to load devices', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDevices(); }, [fetchDevices]);

  const handleRevoke = async (id) => {
    setRevoking(id);
    try {
      await api.delete(`/api/devices/${id}`);
      fetchDevices();
    } catch (err) {
      console.error('Failed to revoke session', err);
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeOthers = async () => {
    setRevoking('all');
    try {
      const { data } = await api.post('/api/devices/revoke-others');
      setMsg(`Revoked ${data.revoked} other session(s).`);
      setTimeout(() => setMsg(''), 3000);
      fetchDevices();
    } catch (err) {
      console.error('Failed to revoke others', err);
    } finally {
      setRevoking(null);
    }
  };

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const deviceIcon = (label) => {
    const l = (label || '').toLowerCase();
    if (l.includes('iphone') || l.includes('android') || l.includes('ios')) return Smartphone;
    if (l.includes('chrome') || l.includes('firefox') || l.includes('safari') || l.includes('edge')) return Laptop;
    return Monitor;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display font-semibold text-lg text-slate-200 mb-1">Connected Devices</h3>
        <p className="text-sm text-slate-500">Manage devices and sessions connected to your account.</p>
      </div>

      {msg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {msg}
        </div>
      )}

      {devices.length > 1 && (
        <button
          onClick={handleRevokeOthers}
          disabled={revoking === 'all'}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 text-sm font-medium transition-colors disabled:opacity-40"
        >
          {revoking === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
          Log out of all other devices
        </button>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
        </div>
      ) : devices.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <Monitor className="w-8 h-8 mx-auto text-slate-600 mb-2" />
          <p className="text-slate-500 text-sm">No active device sessions.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {devices.map((d) => {
            const Icon = deviceIcon(d.deviceLabel);
            return (
              <div
                key={d._id}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-200 truncate">{d.deviceLabel || 'Unknown device'}</p>
                    {d.isCurrent && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 font-medium border border-violet-500/30 flex-shrink-0">
                        This device
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {d.ip && (
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Globe className="w-3 h-3" /> {d.ip}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-500">
                      Active {timeAgo(d.lastActiveAt)}
                    </span>
                    <span className="text-[11px] text-slate-600">
                      Created {timeAgo(d.createdAt)}
                    </span>
                  </div>
                </div>
                {!d.isCurrent && (
                  <button
                    onClick={() => handleRevoke(d._id)}
                    disabled={revoking === d._id}
                    className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 text-xs font-medium transition-colors disabled:opacity-40 flex items-center gap-1.5"
                  >
                    {revoking === d._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                    Log out
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Settings Page ───────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('apikeys');
  const navigate = useNavigate();

  const renderTab = () => {
    switch (activeTab) {
      case 'account':
        return <AccountTab />;
      case 'apikeys':
        return <ApiKeysTab />;
      case 'devices':
        return <DevicesTab />;
      case 'budget':
        return <BudgetTab />;
      case 'appearance':
        return <AppearanceTab />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] overflow-hidden relative z-10 w-full">
      {/* Sidebar */}
      <div className="w-full md:w-64 flex flex-col p-4 border-b md:border-b-0 md:border-r border-white/5 bg-slate-900/50 backdrop-blur-md flex-shrink-0">
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors text-sm font-medium mb-4 md:mb-6 w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Chat
        </button>

        <div className="hidden md:block text-[10px] font-sans font-medium uppercase tracking-widest text-slate-500 mb-3 px-2">
          Settings
        </div>

        <nav className="flex md:flex-col overflow-x-auto space-x-2 md:space-x-0 md:space-y-1 pb-2 md:pb-0 scrollbar-hide w-full">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-2 md:gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium flex-shrink-0',
                activeTab === tab.id
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
        <div className="flex-1 overflow-y-auto bg-slate-950/40 backdrop-blur-3xl w-full">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10">{renderTab()}</div>
      </div>
    </div>
  );
}
