import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showWalletModal, setShowWalletModal] = useState(false);

  const fetchMe = async () => {
    // ─── ELITE CONSOLE CLEANUP ───
    // If we don't have a token, don't even try to fetch the user.
    // This stops the browser from logging a red 401 error in the console.
    if (!api.accessToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, ok } = await api.get('/auth/me');
      if (ok && data.success) {
        setUser(data.user);
      } else {
        setUser(null);
        // Clear token if me fails (likely expired)
        api.setAccessToken(null);
      }
    } catch (err) {
      // Only log if it's a real network error, not a 401
      console.debug('Session check: No active user session found.');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);
      const { data, ok } = await api.post('/auth/login', { email, password });
      if (ok && data.success) {
        api.setAccessToken(data.auth.accessToken);
        setUser(data.user);
        return { success: true };
      } else {
        setError(data.error || 'Login failed');
        return { success: false, error: data.error };
      }
    } catch (err) {
      setError('An unexpected error occurred');
      return { success: false, error: 'Network error' };
    }
  };

  const register = async (name, email, password) => {
    try {
      setError(null);
      const { data, ok } = await api.post('/auth/register', { name, email, password });
      if (ok && data.success) {
        api.setAccessToken(data.auth.accessToken);
        setUser(data.user);
        return { success: true };
      } else {
        setError(data.error || 'Registration failed');
        return { success: false, error: data.error };
      }
    } catch (err) {
      setError('An unexpected error occurred');
      return { success: false, error: 'Network error' };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout request failed:', err);
    } finally {
      api.setAccessToken(null);
      setUser(null);
      window.location.href = '/';
    }
  };

  const loginWithGoogle = () => {
    const isProd = import.meta.env.PROD;
    const API_BASE = isProd ? window.location.origin : (import.meta.env.VITE_API_BASE_URL);
    const next = window.location.pathname + window.location.search;
    window.location.href = `${API_BASE}/api/auth/google/start?next=${encodeURIComponent(next)}`;
  };

  const loginWithWallet = async (walletAddress, signature, message) => {
    try {
      setError(null);
      const { data, ok } = await api.post('/auth/wallet-login', { walletAddress, signature, message });
      if (ok && data.success) {
        if (data.auth?.accessToken) {
          api.setAccessToken(data.auth.accessToken);
        }
        setUser(data.user);
        return { success: true, user: data.user };
      } else {
        setError(data.error || 'Wallet login failed');
        return { success: false, error: data.error };
      }
    } catch (err) {
      setError('An unexpected error occurred');
      return { success: false, error: 'Network error' };
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    loginWithGoogle,
    loginWithWallet,
    refreshUser: fetchMe,
    showWalletModal,
    setShowWalletModal
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
