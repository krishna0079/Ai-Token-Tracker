import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import ChatInterface from '../components/ChatInterface';
import UsageTracker from '../components/UsageTracker';
import { io } from 'socket.io-client';

import { useSettings } from '../contexts/SettingsContext';

export default function DashboardPage() {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [socket, setSocket] = useState(null);
  const [keyStatus, setKeyStatus] = useState({});
  const { activeProvider } = useSettings();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUsageOpen, setIsUsageOpen] = useState(false);
  const navigate = useNavigate();

  // Socket setup
  useEffect(() => {
    const token = localStorage.getItem('token');
    const newSocket = io('http://localhost:5000', {
      auth: { token }
    });
    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  // New-device alert via socket
  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      const msg = `New device login detected: ${data.deviceLabel}${data.ip ? ` from ${data.ip}` : ''}`;
      // Show a simple alert — in production, replace with toast
      const el = document.createElement('div');
      el.className = 'fixed top-4 right-4 z-50 px-4 py-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm shadow-2xl backdrop-blur-xl animate-in slide-in-from-right';
      el.textContent = msg;
      document.body.appendChild(el);
      setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.5s'; setTimeout(() => el.remove(), 500); }, 5000);
    };
    socket.on('device:new', handler);
    return () => socket.off('device:new', handler);
  }, [socket]);

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    try {
      const { data } = await api.get('/api/chat/sessions');
      setSessions(data);
      if (data.length > 0) {
        setCurrentSessionId(prev => prev || data[0]._id);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        window.dispatchEvent(new Event('authchange'));
        navigate('/login');
      }
    }
  }, [navigate]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Fetch key status on mount
  useEffect(() => {
    const fetchKeyStatus = async () => {
      try {
        const { data } = await api.get('/api/api-keys/status');
        setKeyStatus(data);
      } catch (err) {
        console.error('Failed to fetch key status', err);
      }
    };
    fetchKeyStatus();
  }, []);

  const handleCreateSession = async () => {
    try {
      const { data } = await api.post('/api/chat/sessions', { title: 'New Chat', budgetLimit: 100000 });
      setSessions(prev => [data, ...prev]);
      setCurrentSessionId(data._id);
    } catch (err) {
      console.error('Failed to create session', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        window.dispatchEvent(new Event('authchange'));
        navigate('/login');
      }
    }
  };

  const handleTitleChange = async (newTitle) => {
    if (!currentSessionId) return;
    try {
      await api.patch(`/api/chat/sessions/${currentSessionId}`, { title: newTitle });
      fetchSessions();
    } catch (err) {
      console.error('Failed to update title', err);
    }
  };

  // Get current session title
  const currentSession = sessions.find((s) => s._id === currentSessionId);
  const sessionTitle = currentSession?.title || 'New Chat';

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-slate-950 text-slate-200">
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={(id) => {
          setCurrentSessionId(id);
          setIsSidebarOpen(false);
        }}
        onCreateSession={() => {
          handleCreateSession();
          setIsSidebarOpen(false);
        }}
        onSessionsChanged={fetchSessions}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative min-w-0 min-h-0">
        <TopBar
          sessionTitle={sessionTitle}
          activeProvider={activeProvider}
          keyStatus={keyStatus}
          onTitleChange={handleTitleChange}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onToggleUsage={() => setIsUsageOpen(!isUsageOpen)}
        />
        <div className="flex-1 flex overflow-hidden relative min-w-0">
          <ChatInterface sessionId={currentSessionId} socket={socket} keyStatus={keyStatus} />
          <UsageTracker 
            sessionId={currentSessionId} 
            socket={socket} 
            isOpen={isUsageOpen}
            onClose={() => setIsUsageOpen(false)}
          />
        </div>
      </main>
    </div>
  );
}
