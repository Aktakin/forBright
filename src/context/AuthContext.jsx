import { createContext, useContext, useState, useEffect } from 'react';
import { parseJson } from '../utils/api';
import { mockApi } from '../utils/mockApi';

const AuthContext = createContext(null);
const API = '/api';
const DEMO_TOKEN_PREFIX = 'demo-';
const DEMO_USER_KEY = 'bright_demo_user';

function isDemoToken(token) {
  return token && (token === 'demo-patient' || token === 'demo-nurse' || token === 'demo-doctor');
}

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
    // Demo mode: no API call, restore user from localStorage
    if (isDemoToken(token)) {
      try {
        const stored = localStorage.getItem(DEMO_USER_KEY);
        const u = stored ? JSON.parse(stored) : null;
        if (u?.id) setUser(u);
      } catch (_) {}
      setLoading(false);
      return;
    }
    // Real API
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
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role, full_name }),
    });
    const data = await parseJson(res);
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    if (!data.token) throw new Error('Server returned invalid response. Is the backend running?');
    localStorage.setItem('bright_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  /** Log in without backend: use demo data stored in localStorage. */
  const demoLogin = (role) => {
    const roleUsers = { nurse: { id: 2, email: 'nurse@demo.com', name: 'Demo Nurse' }, doctor: { id: 3, email: 'doctor@demo.com', name: 'Demo Doctor' }, patient: { id: 1, email: 'patient@demo.com', name: 'Demo Patient' } };
    const r = roleUsers[role] || roleUsers.patient;
    const u = { id: r.id, email: r.email, role, full_name: r.name };
    const t = DEMO_TOKEN_PREFIX + role;
    localStorage.setItem('bright_token', t);
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(u));
    setToken(t);
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem('bright_token');
    localStorage.removeItem(DEMO_USER_KEY);
    setToken(null);
    setUser(null);
  };

  const authFetch = (path, options = {}) => {
    if (isDemoToken(token) && user) {
      return mockApi(path, options, user);
    }
    return fetch(`${API}${path}`, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${token}` },
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, demoLogin, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
