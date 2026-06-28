import { useState, useRef, useEffect } from 'react';
import { Plus, LogOut, Settings, CreditCard, MoreHorizontal, Pencil, Download, Copy, Trash2, X, Check, Cpu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import api from '../services/api';

// ─── Helpers ─────────────────────────────────────────────────────────
function groupSessionsByDate(sessions) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups = { today: [], yesterday: [], older: [] };

  sessions.forEach((s) => {
    const created = new Date(s.createdAt || s.updatedAt || Date.now());
    if (created >= today) {
      groups.today.push(s);
    } else if (created >= yesterday) {
      groups.yesterday.push(s);
    } else {
      groups.older.push(s);
    }
  });

  return groups;
}

// ─── Session Row ─────────────────────────────────────────────────────
function SessionRow({ session, isActive, onSelect, onSessionsChanged }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(session.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef(null);
  const inputRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
        setConfirmDelete(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus rename input
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handleRename = async () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== session.title) {
      try {
        await api.patch(`/api/chat/sessions/${session._id}`, { title: trimmed });
        onSessionsChanged?.();
      } catch (err) {
        console.error('Failed to rename session', err);
      }
    }
    setIsRenaming(false);
  };

  const handleExport = async () => {
    try {
      const { data } = await api.get(`/api/chat/sessions/${session._id}/export?format=md`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${session.title}.md`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export session', err);
    }
    setMenuOpen(false);
  };

  const handleDuplicate = async () => {
    try {
      await api.post(`/api/chat/sessions/${session._id}/duplicate`);
      onSessionsChanged?.();
    } catch (err) {
      console.error('Failed to duplicate session', err);
    }
    setMenuOpen(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      await api.delete(`/api/chat/sessions/${session._id}`);
      onSessionsChanged?.();
    } catch (err) {
      console.error('Failed to delete session', err);
    }
    setMenuOpen(false);
    setConfirmDelete(false);
  };

  if (isRenaming) {
    return (
      <div className="flex items-center gap-1 px-2 py-1">
        <input
          ref={inputRef}
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRename();
            if (e.key === 'Escape') setIsRenaming(false);
          }}
          onBlur={handleRename}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-slate-200 outline-none focus:border-violet-500/50 min-w-0"
        />
        <button onClick={handleRename} className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded">
          <Check className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setIsRenaming(false)} className="p-1 text-slate-500 hover:bg-white/5 rounded">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="group relative">
      <button
        onClick={() => onSelect(session._id)}
        className={clsx(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left',
          isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
        )}
      >
        <div
          className={clsx(
            'w-2 h-2 rounded-full flex-shrink-0',
            session.totalTokens > session.budgetLimit
              ? 'bg-red-500'
              : session.totalTokens > session.budgetLimit * 0.8
              ? 'bg-amber-500'
              : 'bg-emerald-500'
          )}
        />
        <span className="truncate text-sm font-medium flex-1">{session.title}</span>
      </button>

      {/* Overflow menu button — visible on hover */}
      <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" ref={menuRef}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
            setConfirmDelete(false);
          }}
          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-40 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-1.5 z-50">
            <button
              onClick={() => {
                setMenuOpen(false);
                setIsRenaming(true);
                setRenameValue(session.title);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" /> Rename
            </button>
            <button
              onClick={handleExport}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button
              onClick={handleDuplicate}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
            >
              <Copy className="w-3.5 h-3.5" /> Duplicate
            </button>
            <div className="border-t border-white/5 my-1" />
            <button
              onClick={handleDelete}
              className={clsx(
                'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                confirmDelete
                  ? 'text-red-300 bg-red-500/10 hover:bg-red-500/20'
                  : 'text-red-400 hover:bg-red-500/10'
              )}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {confirmDelete ? 'Confirm delete?' : 'Delete'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Date Group ──────────────────────────────────────────────────────
function DateGroup({ label, sessions, currentSessionId, onSelectSession, onSessionsChanged }) {
  if (sessions.length === 0) return null;
  return (
    <div className="mb-4">
      <div className="text-[10px] font-sans font-medium uppercase tracking-widest text-slate-600 mb-2 px-2">
        {label}
      </div>
      <div className="space-y-0.5">
        {sessions.map((s) => (
          <SessionRow
            key={s._id}
            session={s}
            isActive={currentSessionId === s._id}
            onSelect={onSelectSession}
            onSessionsChanged={onSessionsChanged}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────
export default function Sidebar({ sessions, currentSessionId, onSelectSession, onCreateSession, onSessionsChanged, isOpen, onClose }) {
  const navigate = useNavigate();
  const groups = groupSessionsByDate(sessions);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.dispatchEvent(new Event('authchange'));
    navigate('/login');
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      <div className={clsx(
        "w-64 max-w-[85vw] flex flex-col p-4 border-r border-white/5 bg-slate-900/80 md:bg-slate-900/50 backdrop-blur-2xl z-50 transition-transform duration-300 ease-out",
        "fixed md:static inset-y-0 left-0",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-violet-600 flex items-center justify-center text-white font-display font-bold text-sm shadow-lg">
              Ai
            </div>
            <span className="font-display font-bold tracking-wide text-slate-200">TOKENMONITOR</span>
          </div>
          <button onClick={onClose} className="md:hidden p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

      {/* New Chat Button */}
      <button
        onClick={onCreateSession}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-violet-600/20 text-violet-400 hover:bg-violet-600/30 hover:text-violet-300 transition-colors text-sm font-medium mb-4"
      >
        <Plus className="w-4 h-4" />
        New Chat
      </button>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto pr-1 -mr-1">
        <DateGroup
          label="Today"
          sessions={groups.today}
          currentSessionId={currentSessionId}
          onSelectSession={onSelectSession}
          onSessionsChanged={onSessionsChanged}
        />
        <DateGroup
          label="Yesterday"
          sessions={groups.yesterday}
          currentSessionId={currentSessionId}
          onSelectSession={onSelectSession}
          onSessionsChanged={onSessionsChanged}
        />
        <DateGroup
          label="Older"
          sessions={groups.older}
          currentSessionId={currentSessionId}
          onSelectSession={onSelectSession}
          onSessionsChanged={onSessionsChanged}
        />
        {sessions.length === 0 && (
          <p className="text-slate-600 text-xs text-center mt-8 px-2">
            No sessions yet. Start a new chat!
          </p>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="pt-4 mt-4 border-t border-white/10 space-y-1">
        <button
          onClick={() => navigate('/models')}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors text-sm font-medium"
        >
          <Cpu className="w-4 h-4" />
          Models
        </button>
        <button
          onClick={() => navigate('/settings')}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors text-sm font-medium"
        >
          <CreditCard className="w-4 h-4" />
          Usage & Billing
        </button>
        <button
          onClick={() => navigate('/settings')}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors text-sm font-medium"
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </button>
      </div>
    </div>
    </>
  );
}
