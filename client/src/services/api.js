import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// REST fallback for sending chat messages (non-streaming)
export async function sendChatMessage(sessionId, provider, text) {
  const { data } = await api.post('/api/chat/messages', { sessionId, provider, text });
  return data;
}

export default api;
