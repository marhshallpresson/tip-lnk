import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Initialize from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('tipstack_auth_token');
    if (storedToken) {
      api.setAccessToken(storedToken);
    }
  }, []);

  const fetchMe = async () => {
    if (!api.accessToken) {
      setUser(null);
      setLoading(false);
      localStorage.removeItem('tipstack_auth_token');
      return;
    }

    try {
      setLoading(true);
      const { data, ok } = await api.get('/auth/me');
      if (ok && data.success) {
        setUser(data.user);
        // Persist token to localStorage for session recovery
        localStorage.setItem('tipstack_auth_token', api.accessToken);
      } else {
        setUser(null);
        api.setAccessToken(null);
        localStorage.removeItem('tipstack_auth_token');
      }
    } catch (err) {
      console.debug('Session check: No active user session found.');
      setUser(null);
      localStorage.removeItem('tipstack_auth_token');
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
        // Persist token for session recovery
        localStorage.setItem('tipstack_auth_token', data.auth.accessToken);
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
        // Persist token for session recovery
        localStorage.setItem('tipstack_auth_token', data.auth.accessToken);
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
      localStorage.removeItem('tipstack_auth_token');
      setUser(null);
      window.location.href = '/';
    }
  };

  const loginWithGoogle = () => {
    const isProd = import.meta.env.PROD;
    const API_BASE = isProd ? window.location.origin : (import.meta.env.VITE_API_BASE_URL);
    const next = window.location.pathname + window.location.search;
    
    // Popup window configuration
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const popup = window.open(
      `${API_BASE}/api/auth/google/start?next=${encodeURIComponent(next)}`,
      'tipstack_auth',
      `width=${width},height=${height},left=${left},top=${top},status=no,location=no,menubar=no,toolbar=no`
    );

    if (!popup) {
      setError('Popup blocked. Please allow popups for this site.');
      return;
    }

    const handleMessage = async (event) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data?.type === 'AUTH_SUCCESS') {
        const { accessToken, user: userData } = event.data;
        api.setAccessToken(accessToken);
        localStorage.setItem('tipstack_auth_token', accessToken);
        setUser(userData);
        window.removeEventListener('message', handleMessage);
      } else if (event.data?.type === 'AUTH_ERROR') {
        setError(event.data.error || 'Authentication failed.');
        window.removeEventListener('message', handleMessage);
      }
    };

    window.addEventListener('message', handleMessage);
  };

  const loginWithPhantomSocial = async (provider = 'google') => {
    try {
      setError(null);
      // Phantom Social (Google) uses a redirect flow by default in BrowserSDK
      // But we want to manage it in a popup if possible, or handle the redirect.
      // For now, let's keep it in the current window but ensure state is handled.
      const result = await phantomSdk.connect({ provider });
      if (result && result.publicKey) {
        // This will only run if NO REDIRECT happened (e.g. desktop)
        const addr = result.publicKey.toBase58();
        // Trigger SIWS
        // ... handled in WalletConnect for now to keep context
        return { success: true, publicKey: result.publicKey };
      }
    } catch (err) {
      setError(err.message || 'Phantom connection failed');
      return { success: false, error: err.message };
    }
  };

  const loginWithWallet = async (walletAddress, signature, message) => {
    try {
      setError(null);
      const { data, ok } = await api.post('/auth/wallet-login', { walletAddress, signature, message });
      if (ok && data.success) {
        if (data.auth?.accessToken) {
          api.setAccessToken(data.auth.accessToken);
          // Persist token for session recovery
          localStorage.setItem('tipstack_auth_token', data.auth.accessToken);
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

  const checkEmailStatus = async (email) => {
    try {
      const { data, ok } = await api.post('/auth/check', { email });
      if (ok && data.success) return data;
      return { success: false, error: data.error || 'Check failed' };
    } catch (err) {
      return { success: false, error: 'Network error' };
    }
  };

  const initLoginOtp = async (email) => {
    try {
      const { data, ok } = await api.post('/auth/otp/start', { email });
      if (ok && data.success) return { success: true };
      return { success: false, error: data.error || 'Failed to send code' };
    } catch (err) {
      return { success: false, error: 'Network error' };
    }
  };

  const verifyLoginOtp = async (email, code) => {
    try {
      const { data, ok } = await api.post('/auth/otp/verify', { email, code });
      if (ok && data.success) {
        api.setAccessToken(data.auth.accessToken);
        localStorage.setItem('tipstack_auth_token', data.auth.accessToken);
        setUser(data.user);
        return { success: true, user: data.user };
      }
      return { success: false, error: data.error || 'Verification failed' };
    } catch (err) {
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
    checkEmailStatus,
    initLoginOtp,
    verifyLoginOtp,
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
