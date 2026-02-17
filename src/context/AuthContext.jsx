import { createContext, useContext, useState, useEffect } from 'react';
import { parseJson } from '../utils/api';

const AuthContext = createContext(null);
const API = '/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('bright_token'));
  const [loading, setLoading] = useState(!!token);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        const data = await parseJson(r);
        if (r.ok && data.id) return data;
        throw new Error(data.error || 'Session invalid');
      })
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('bright_token');
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const login = async (email, password) => {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await parseJson(res);
    if (!res.ok) throw new Error(data.error || 'Login failed');
    if (!data.token) throw new Error('Server returned invalid response. Is the backend running?');
    localStorage.setItem('bright_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const register = async (email, password, role = 'patient', full_name) => {
    let res;
    try {
      res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role, full_name }),
      });
    } catch (err) {
      throw new Error('Cannot reach server. Is the backend running? Start it with: npm run server');
    }
    const data = await parseJson(res);
    if (!res.ok) {
      const msg = data?.error || data?.message || `Request failed (${res.status})`;
      throw new Error(msg);
    }
    if (!data.token) throw new Error('Server returned invalid response. Is the backend running?');
    localStorage.setItem('bright_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('bright_token');
    setToken(null);
    setUser(null);
  };

  const authFetch = (path, options = {}) => {
    return fetch(`${API}${path}`, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${token}` },
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
