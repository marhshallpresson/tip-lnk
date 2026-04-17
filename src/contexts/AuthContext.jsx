import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showWalletModal, setShowWalletModal] = useState(false);

  const fetchMe = async () => {
    try {
      setLoading(true);
      const { data, ok } = await api.get('/auth/me');
      if (ok && data.success) {
        setUser(data.user);
      } else {
        setUser(null);
        // Clear token if me fails with 401
        if (data.status === 401) {
          api.setAccessToken(null);
        }
      }
    } catch (err) {
      console.error('Fetch me failed:', err);
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
    const next = window.location.pathname + window.location.search;
    window.location.href = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/auth/google/start?next=${encodeURIComponent(next)}`;
  };

  const loginWithWallet = async (walletAddress) => {
    try {
      setError(null);
      const { data, ok } = await api.post('/auth/wallet-login', { walletAddress });
      if (ok && data.success) {
        if (data.auth?.accessToken) {
          api.setAccessToken(data.auth.accessToken);
        }
        setUser(data.user);
        return { success: true };
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
