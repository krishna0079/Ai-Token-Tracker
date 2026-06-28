import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const SettingsContext = createContext(null);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const [activeProvider, setActiveProvider] = useState('openai');
  const [profileImage, setProfileImage] = useState('');
  const [aiAgentIcon, setAiAgentIcon] = useState('bot');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [isLoading, setIsLoading] = useState(true);

  // Sync theme to localStorage and HTML root
  useEffect(() => {
    localStorage.setItem('theme', theme);
    
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  // Fetch initial profile
  useEffect(() => {
    const fetchUserPreferences = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const { data } = await api.get('/api/users/me');
        if (data.profileImage) setProfileImage(data.profileImage);
        if (data.aiAgentIcon) setAiAgentIcon(data.aiAgentIcon);
      } catch (err) {
        console.error('Failed to load user preferences', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserPreferences();
  }, []);

  const updateProfileImage = async (url) => {
    try {
      const { data } = await api.patch('/api/users/me', { profileImage: url });
      setProfileImage(data.profileImage);
      return true;
    } catch (err) {
      console.error('Failed to update profile image', err);
      return false;
    }
  };

  const updateAiAgentIcon = async (icon) => {
    try {
      const { data } = await api.patch('/api/users/me', { aiAgentIcon: icon });
      setAiAgentIcon(data.aiAgentIcon);
      return true;
    } catch (err) {
      console.error('Failed to update ai agent icon', err);
      return false;
    }
  };

  const value = {
    activeProvider,
    setActiveProvider,
    profileImage,
    updateProfileImage,
    aiAgentIcon,
    updateAiAgentIcon,
    theme,
    setTheme,
    isLoading
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
