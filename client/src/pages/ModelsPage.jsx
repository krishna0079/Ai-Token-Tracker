import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, Cpu, DollarSign, Zap, Check } from 'lucide-react';
import clsx from 'clsx';

const PROVIDER_META = {
  openai: { name: 'OpenAI', color: 'from-green-500 to-emerald-600', text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  claude: { name: 'Claude', color: 'from-orange-500 to-amber-600', text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  gemini: { name: 'Gemini', color: 'from-blue-500 to-cyan-600', text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  groq: { name: 'Groq', color: 'from-purple-600 to-violet-500', text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  deepseek: { name: 'DeepSeek', color: 'from-indigo-500 to-purple-600', text: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
};

const PRICING = {
  openai: {
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  },
  claude: {
    'claude-3-5-sonnet-20240620': { input: 0.003, output: 0.015 },
    'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
    'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
  },
  gemini: {
    'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
    'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
    'gemini-2.0-flash': { input: 0.0001, output: 0.0004 },
  },
  groq: {
    'llama-3.3-70b-versatile': { input: 0.00059, output: 0.00079 },
    'llama-3.1-8b-instant': { input: 0.00005, output: 0.00008 },
    'mixtral-8x7b-32768': { input: 0.00024, output: 0.00024 },
  },
  deepseek: {
    'deepseek-chat': { input: 0.00014, output: 0.00028 },
    'deepseek-reasoner': { input: 0.00055, output: 0.00219 },
  },
};

export default function ModelsPage() {
  const navigate = useNavigate();
  const [keyStatus, setKeyStatus] = useState({});

  useEffect(() => {
    api.get('/api/api-keys/status').then(({ data }) => setKeyStatus(data)).catch(() => {});
  }, []);

  return (
    <div className="flex h-screen overflow-hidden relative z-10">
      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:flex w-64 flex-col p-4 border-r border-white/5 bg-slate-900/50 backdrop-blur-md">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors text-sm font-medium mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Chat
        </button>
        <div className="text-[10px] font-sans font-medium uppercase tracking-widest text-slate-500 mb-3 px-2">
          Models
        </div>
        <nav className="space-y-1">
          {Object.entries(PROVIDER_META).map(([id, meta]) => (
            <div key={id} className="px-3 py-2.5 rounded-xl bg-white/5 text-slate-300 text-sm font-medium flex items-center gap-3">
              <div className={clsx('w-2 h-2 rounded-full', id === 'openai' ? 'bg-green-500' : id === 'claude' ? 'bg-orange-500' : 'bg-blue-500')} />
              {meta.name}
              {keyStatus[id]?.exists && <Check className="w-3 h-3 text-emerald-400 ml-auto" />}
            </div>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-950/40 backdrop-blur-3xl min-w-0">
        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-slate-900/50">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <span className="text-sm font-display font-semibold text-slate-300">Models</span>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10 space-y-8">
          <div>
            <h2 className="font-display font-semibold text-2xl text-slate-100">Available Models</h2>
            <p className="text-slate-500 text-sm mt-1">Pricing shown per 1K tokens (USD).</p>
          </div>

          {Object.entries(PRICING).map(([provider, models]) => {
            const meta = PROVIDER_META[provider];
            return (
              <div key={provider} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className={clsx('w-8 h-8 rounded-lg bg-gradient-to-tr flex items-center justify-center text-white font-display font-bold text-sm shadow-lg', meta.color)}>
                    {meta.name.charAt(0)}
                  </div>
                  <h3 className="font-display font-semibold text-lg text-slate-200">{meta.name}</h3>
                  {keyStatus[provider]?.exists && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Key configured
                    </span>
                  )}
                </div>

                <div className="grid gap-3">
                  {Object.entries(models).map(([model, rates]) => (
                    <div key={model} className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Cpu className="w-5 h-5 text-slate-500 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-slate-200">{model}</p>
                          <p className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5">
                            <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> ${rates.input.toFixed(5)} / 1K input</span>
                            <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> ${rates.output.toFixed(5)} / 1K output</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
