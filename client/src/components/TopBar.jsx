import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  Settings,
  User,
  LogOut,
  Key,
  ChevronDown,
  Check,
  X,
  Pencil,
  CreditCard,
  Menu,
  Activity,
} from 'lucide-react';

import { useSettings } from '../contexts/SettingsContext';

export default function TopBar({
  sessionTitle = 'New Chat',
  keyStatus = {},
  onTitleChange,
  onToggleSidebar,
  onToggleUsage,
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(sessionTitle);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const titleInputRef = useRef(null);
  const prevSessionTitleRef = useRef(sessionTitle);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { activeProvider, profileImage } = useSettings();

  // Sync title prop when sessionTitle changes
  useEffect(() => {
    if (sessionTitle !== prevSessionTitleRef.current && !isEditingTitle) {
      prevSessionTitleRef.current = sessionTitle;
      setEditedTitle(sessionTitle);
    }
  }, [sessionTitle, isEditingTitle]);

  // Focus title input on edit
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTitleSave = () => {
    const trimmed = editedTitle.trim();
    if (trimmed && trimmed !== sessionTitle) {
      onTitleChange?.(trimmed);
    } else {
      setEditedTitle(sessionTitle);
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') handleTitleSave();
    if (e.key === 'Escape') {
      setEditedTitle(sessionTitle);
      setIsEditingTitle(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.dispatchEvent(new Event('authchange'));
    navigate('/login');
  };

  // Determine if user has key for active provider
  const hasKey = keyStatus[activeProvider]?.exists;

  // Model display names
  const modelNames = {
    openai: 'GPT-4o',
    claude: 'Claude 3.5',
    gemini: 'Gemini Pro',
  };

  const providerColors = {
    openai: 'bg-green-500/20 text-green-400 border-green-500/30',
    claude: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    gemini: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };

  const dropdownItems = [
    { label: 'Profile', icon: User, action: () => navigate('/settings') },
    { label: 'Settings', icon: Settings, action: () => navigate('/settings') },
    { label: 'Usage & Billing', icon: CreditCard, action: () => navigate('/settings') },
    { label: 'Log out', icon: LogOut, action: handleLogout, danger: true },
  ];

  return (
    <div className="flex items-center justify-between px-5 py-3 bg-slate-900/50 backdrop-blur-md border-b border-white/5 z-[100] relative">
      {/* Left — Session Title */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-1.5 -ml-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        {isEditingTitle ? (
          <div className="flex items-center gap-1.5">
            <input
              ref={titleInputRef}
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              onBlur={handleTitleSave}
              className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-sm text-slate-200 font-medium outline-none focus:border-violet-500/50 min-w-[100px] sm:min-w-[200px]"
            />
            <button
              onClick={handleTitleSave}
              className="p-1 rounded text-emerald-400 hover:bg-emerald-500/10 transition-colors flex-shrink-0"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setEditedTitle(sessionTitle);
                setIsEditingTitle(false);
              }}
              className="p-1 rounded text-slate-500 hover:bg-white/5 transition-colors flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditingTitle(true)}
            className="group flex items-center gap-2 text-sm font-medium text-slate-200 hover:text-white transition-colors truncate max-w-[120px] sm:max-w-[200px] md:max-w-xs"
          >
            <span className="truncate">{sessionTitle}</span>
            <Pencil className="w-3 h-3 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" />
          </button>
        )}
      </div>

      {/* Center — Active Model Badge (hidden on small screens) */}
      <div className="hidden sm:flex items-center justify-center">
        <span
          className={clsx(
            'px-3 py-1 rounded-full text-xs font-medium border',
            providerColors[activeProvider] || providerColors.openai
          )}
        >
          {modelNames[activeProvider] || activeProvider}
        </span>
      </div>

      {/* Right — Key Status + Avatar Dropdown */}
      <div className="flex items-center gap-3 flex-1 justify-end">
        {/* Key Status Badge */}
        <div
          className={clsx(
            'flex items-center gap-1.5 px-1.5 sm:px-2.5 py-1 rounded-full text-[11px] font-medium border',
            hasKey
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          )}
        >
          <Key className="w-3 h-3" />
          <span className="hidden sm:inline">{hasKey ? 'Using your API key' : 'Free trial'}</span>
        </div>

        {/* Avatar Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl hover:bg-white/5 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-violet-500 to-fuchsia-600 flex items-center justify-center overflow-hidden">
              {profileImage ? (
                <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-white" />
              )}
            </div>
            <ChevronDown
              className={clsx(
                'w-3.5 h-3.5 text-slate-500 transition-transform duration-200',
                dropdownOpen && 'rotate-180'
              )}
            />
          </button>

          {dropdownOpen && (
            <>
              {/* Invisible full-screen backdrop to catch clicks and provide visual separation */}
              <div className="fixed inset-0 z-[998]" onClick={() => setDropdownOpen(false)} />
              {/* Dropdown menu */}
              <div className="absolute right-0 top-full mt-2 w-52 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.5)] py-1.5 z-[999] animate-in fade-in slide-in-from-top-2 duration-150">
                {dropdownItems.map((item) => (
                  <React.Fragment key={item.label}>
                    {item.danger && (
                      <div className="border-t border-white/5 my-1" />
                    )}
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        item.action();
                      }}
                      className={clsx(
                        'w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors',
                        item.danger
                          ? 'text-red-400 hover:bg-red-500/10'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      )}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Mobile Usage Toggle */}
        <button
          onClick={onToggleUsage}
          className="xl:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Activity className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
