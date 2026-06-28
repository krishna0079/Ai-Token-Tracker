import { useState, useEffect } from 'react';
import api from '../services/api';
import { Activity, DollarSign, Zap, ChevronRight, AlertTriangle, XCircle } from 'lucide-react';
import clsx from 'clsx';

export default function UsageTracker({ sessionId, socket, isOpen, onClose }) {
  const [session, setSession] = useState(null);
  const [alert, setAlert] = useState(null);
  const [lastMessage, setLastMessage] = useState(null);
  const [history, setHistory] = useState([]); // Step 6: session history log

  // Load session on change
  useEffect(() => {
    if (!sessionId) return;
    const fetchSession = async () => {
      try {
        const { data } = await api.get(`/api/chat/sessions/${sessionId}`);
        setSession(data.session);
        setAlert(null);
        setLastMessage(null);
      } catch (err) {
        console.error("Failed to load session details", err);
      }
    };
    fetchSession();
  }, [sessionId]);

  // Step 6: Load session history list
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data } = await api.get('/api/chat/sessions');
        setHistory(data);
      } catch (err) {
        console.error("Failed to load session history", err);
      }
    };
    fetchHistory();
  }, [sessionId]);

  // Step 5+6: Listen for live usage updates and budget warnings
  useEffect(() => {
    if (!socket) return;

    socket.on('usage:update', ({ totalTokens, totalCost, lastMessage: lm }) => {
      setSession(prev => prev ? { ...prev, totalTokens, totalCost } : null);
      if (lm) setLastMessage(lm);
    });

    socket.on('budget:warning', (warningType) => {
      setAlert(warningType);
    });

    return () => {
      socket.off('usage:update');
      socket.off('budget:warning');
    };
  }, [socket]);

  if (!session) {
    return (
      <div className="hidden xl:flex w-80 border-l border-white/5 bg-slate-900/50 backdrop-blur-md p-6 items-center justify-center">
        <p className="text-slate-500 text-sm">Select a session</p>
      </div>
    );
  }

  const percentUsed = Math.min((session.totalTokens / session.budgetLimit) * 100, 100);
  const isDanger = percentUsed >= 100;
  const isWarning = percentUsed >= 80 && !isDanger;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 xl:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      <div className={clsx(
        "w-80 max-w-[85vw] flex flex-col border-l border-white/5 bg-slate-900/80 xl:bg-slate-900/50 backdrop-blur-2xl overflow-y-auto z-50 transition-transform duration-300 ease-out",
        "fixed xl:static inset-y-0 right-0",
        isOpen ? "translate-x-0" : "translate-x-full xl:translate-x-0"
      )}>
        {/* Mobile Header */}
        <div className="flex xl:hidden items-center justify-between p-4 border-b border-white/5">
          <h3 className="font-display font-semibold text-slate-200">Usage Tracker</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      {/* Step 6: Budget Alert Banner */}
      {alert && (
        <div className={clsx(
          "px-4 py-3 flex items-start gap-3 border-b transition-all",
          isDanger
            ? "bg-red-500/10 border-red-500/20 text-red-400"
            : "bg-amber-500/10 border-amber-500/20 text-amber-400"
        )}>
          {isDanger ? <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
          <div>
            <p className="text-sm font-semibold">
              {isDanger ? "Budget limit reached" : "Approaching limit"}
            </p>
            <p className="text-xs opacity-70 mt-0.5">
              {isDanger
                ? "This session has consumed its full token budget."
                : `${percentUsed.toFixed(0)}% of your ${session.budgetLimit.toLocaleString()} token budget used.`}
            </p>
          </div>
        </div>
      )}

      <div className="p-5 space-y-5 flex-1">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-violet-400" />
          <h3 className="font-display font-semibold tracking-wide text-slate-200 text-sm">Live Usage</h3>
        </div>

        {/* Step 5: Token Counter Card */}
        <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-sans uppercase tracking-widest text-slate-500">Total Tokens</span>
            <Zap className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <div className="text-2xl font-display font-bold text-slate-100">
            {session.totalTokens.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mb-3">
            / {session.budgetLimit.toLocaleString()} limit
          </div>
          {/* Progress bar */}
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className={clsx("h-full rounded-full transition-all duration-700",
                isDanger ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-emerald-500"
              )}
              style={{ width: `${percentUsed}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-slate-600">0</span>
            <span className={clsx("text-[10px] font-medium", isDanger ? "text-red-400" : isWarning ? "text-amber-400" : "text-emerald-400")}>
              {percentUsed.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Step 5: Cost Card */}
        <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-sans uppercase tracking-widest text-slate-500">Session Cost</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-display font-bold text-slate-100">
            ${session.totalCost.toFixed(5)}
          </div>
          <div className="text-[11px] text-slate-500">Cumulative USD</div>
        </div>

        {/* Step 5: Last Message Breakdown */}
        {lastMessage && (
          <div className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-2">
            <span className="text-[10px] font-sans uppercase tracking-widest text-slate-500">Last Response</span>
            <div className="text-[11px] text-slate-400 font-mono flex flex-col gap-1.5 mt-2">
              <div className="flex justify-between">
                <span>Provider</span>
                <span className="text-violet-400 capitalize">{lastMessage.provider}</span>
              </div>
              <div className="flex justify-between">
                <span>Model</span>
                <span className="text-slate-300 text-right max-w-[130px] truncate">{lastMessage.model}</span>
              </div>
              <div className="border-t border-white/5 pt-1.5 flex justify-between">
                <span>Input tokens</span>
                <span className="text-slate-300">{lastMessage.inputTokens.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Output tokens</span>
                <span className="text-slate-300">{lastMessage.outputTokens.toLocaleString()}</span>
              </div>
              <div className="border-t border-white/5 pt-1.5 flex justify-between">
                <span>Input cost</span>
                <span className="text-slate-300">${lastMessage.inputCost.toFixed(5)}</span>
              </div>
              <div className="flex justify-between">
                <span>Output cost</span>
                <span className="text-slate-300">${lastMessage.outputCost.toFixed(5)}</span>
              </div>
              <div className="border-t border-white/5 pt-1.5 flex justify-between font-semibold">
                <span className="text-slate-300">Message cost</span>
                <span className="text-emerald-400">${lastMessage.totalCost.toFixed(5)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Session History Log */}
        {history.length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] font-sans uppercase tracking-widest text-slate-500">Session History</span>
            <div className="space-y-1.5 mt-2">
              {history.map(s => {
                const pct = Math.min((s.totalTokens / s.budgetLimit) * 100, 100);
                const isOverBudget = pct >= 100;
                const isNearBudget = pct >= 80;
                return (
                  <div key={s._id} className={clsx(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-[11px]",
                    s._id === sessionId ? "bg-white/10" : "bg-white/5"
                  )}>
                    <div className={clsx("w-1.5 h-1.5 rounded-full flex-shrink-0",
                      isOverBudget ? "bg-red-500" : isNearBudget ? "bg-amber-500" : "bg-emerald-500"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-300 truncate font-medium">{s.title}</p>
                      <p className="text-slate-500">{s.totalTokens.toLocaleString()} tk · ${s.totalCost.toFixed(4)}</p>
                    </div>
                    <ChevronRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

