import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import ModelsPage from './pages/ModelsPage';

import { SettingsProvider } from './contexts/SettingsContext';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    const check = () => setIsAuthenticated(!!localStorage.getItem('token'));
    window.addEventListener('authchange', check);
    return () => window.removeEventListener('authchange', check);
  }, []);

  return (
    <SettingsProvider>
      <Router>
        <div className="h-[100dvh] overflow-hidden bg-slate-950 text-slate-100 font-sans bg-gradient-mesh relative">
          {/* Glow blobs behind everything */}
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-orange-600/20 blur-[120px] rounded-full pointer-events-none" />
          
          <Routes>
            <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" />} />
            <Route path="/settings" element={isAuthenticated ? <SettingsPage /> : <Navigate to="/login" />} />
            <Route path="/models" element={isAuthenticated ? <ModelsPage /> : <Navigate to="/login" />} />
            <Route path="/" element={isAuthenticated ? <DashboardPage /> : <Navigate to="/login" />} />
          </Routes>
        </div>
      </Router>
    </SettingsProvider>
  );
}

export default App;
