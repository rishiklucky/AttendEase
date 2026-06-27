import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 hour in ms

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('ae_token'));
  const [authLoading, setAuthLoading] = useState(true);
  const inactivityTimer = useRef(null);

  // ── Set axios auth header whenever token changes ──────────────────────────
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('ae_token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('ae_token');
    }
  }, [token]);

  // ── Verify stored token on app load ──────────────────────────────────────
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) { setAuthLoading(false); return; }
      try {
        const res = await axios.get(`${API_URL}/auth/me`);
        setUser(res.data.user);
      } catch {
        setToken(null);
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };
    verifyToken();
  }, []);

  // ── Inactivity logout ─────────────────────────────────────────────────────
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      logout('inactivity');
    }, INACTIVITY_TIMEOUT);
  }, []);

  useEffect(() => {
    if (!user) return;
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(e => window.addEventListener(e, resetInactivityTimer));
    resetInactivityTimer(); // start timer immediately after login
    return () => {
      events.forEach(e => window.removeEventListener(e, resetInactivityTimer));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [user, resetInactivityTimer]);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    const res = await axios.post(`${API_URL}/auth/login`, { email, password });
    const { token: newToken, user: newUser } = res.data;
    setToken(newToken);
    setUser(newUser);
    return res.data;
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = (reason = 'manual') => {
    setToken(null);
    setUser(null);
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (reason === 'inactivity') {
      // Store flag to show message on login page
      sessionStorage.setItem('ae_logout_reason', 'inactivity');
    }
    window.location.hash = '#login';
  };

  const isAuthenticated = !!user && !!token;

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, authLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
