import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/api';
import { getAuthToken, useDynamicContext, useIsLoggedIn } from '@dynamic-labs/sdk-react-core';
import { authEvents } from '../lib/auth-events';

const AuthContext = createContext();

const readDynamicAuthToken = (candidateToken) => {
  if (candidateToken) return candidateToken;
  try {
    return getAuthToken() || null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const dynamicContext = useDynamicContext();
  const isDynamicLoggedIn = useIsLoggedIn();
  const syncingTokenRef = useRef(null);
  const lastSuccessfulTokenRef = useRef(null);
  const lastFailedTokenRef = useRef(null);

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

  const dynamicLogout = dynamicContext?.handleLogOut || dynamicContext?.handleLogout;

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout request failed:', err);
    } finally {
      // ——— ELITE IDENTITY SYNC: UNIFIED LOGOUT ———
      // Terminate both local and Dynamic identity sessions simultaneously.
      if (typeof dynamicLogout === 'function') {
        dynamicLogout();
      }
      
      api.setAccessToken(null);
      localStorage.removeItem('tipstack_auth_token');
      setUser(null);
      window.location.href = '/';
    }
  };

  const syncWithDynamic = useCallback(async (dynamicJwt) => {
    const token = readDynamicAuthToken(dynamicJwt);
    if (!token) {
      setLoading(false);
      return { success: false, error: 'Missing Dynamic auth token.' };
    }

    if (syncingTokenRef.current === token) {
      return { success: false, error: 'Dynamic sync already in progress.' };
    }
    
    try {
      console.log('[Auth] Starting sync with Dynamic token...');
      syncingTokenRef.current = token;
      setLoading(true);
      setError(null);

      // ——— ELITE SECURITY: CLEAR STALE SESSIONS ———
      api.setAccessToken(null);
      localStorage.removeItem('tipstack_auth_token');

      const { data, ok } = await api.post('/auth/dynamic-verify', { dynamicJwt: token });
      
      if (ok && data.success) {
        console.log('[Auth] Sync successful. Token exchanged.');
        api.setAccessToken(data.auth.accessToken);
        localStorage.setItem('tipstack_auth_token', data.auth.accessToken);
        setUser(data.user);
        lastSuccessfulTokenRef.current = token;
        lastFailedTokenRef.current = null;
        return { success: true, user: data.user };
      }
      
      console.error('[Auth] Sync failed:', data?.error);
      const errorMsg = data.error || 'Identity synchronization failed.';
      setError(errorMsg);
      lastFailedTokenRef.current = token;
      return { success: false, error: errorMsg };
    } catch (err) {
      console.error(' Auth Sync Error:', err);
      setError('A network error occurred during authentication.');
      lastFailedTokenRef.current = token;
      return { success: false, error: 'Network error' };
    } finally {
      syncingTokenRef.current = null;
      setLoading(false);
    }
  }, []);

  const dynamicAuthToken = dynamicContext?.authToken;
  const sdkHasLoaded = Boolean(dynamicContext?.sdkHasLoaded);

  // Dynamic event bridge: onAuthSuccess/onAuthFlowClose happen outside this React context.
  useEffect(() => {
    let cancelled = false;

    const syncFromDynamicEvent = async (event = {}) => {
      for (let attempt = 0; attempt < 8 && !cancelled; attempt += 1) {
        const token = readDynamicAuthToken(event.authToken || dynamicAuthToken);
        if (token) {
          await syncWithDynamic(token);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      if (!cancelled) {
        setError('Dynamic login completed, but no auth token was returned. Please retry sign in.');
        setLoading(false);
      }
    };

    const offAuthSuccess = authEvents.on('authSuccess', syncFromDynamicEvent);
    const offAuthFlowClose = authEvents.on('authFlowClose', syncFromDynamicEvent);

    return () => {
      cancelled = true;
      offAuthSuccess();
      offAuthFlowClose();
    };
  }, [dynamicAuthToken, syncWithDynamic]);

  // Bridge API unauthorized handler and restored Dynamic sessions to TipStack sessions.
  useEffect(() => {
    if (sdkHasLoaded && isDynamicLoggedIn) {
      const token = readDynamicAuthToken(dynamicAuthToken);
      if (token && lastFailedTokenRef.current !== token && (!user || lastSuccessfulTokenRef.current !== token)) {
        syncWithDynamic(token);
      }
    }

    if (sdkHasLoaded && !isDynamicLoggedIn && user && !loading) {
      console.warn('Dynamic identity lost. Cleaning up TipStack session...');
      // Use local cleanup to avoid infinite redirection loops
      api.setAccessToken(null);
      localStorage.removeItem('tipstack_auth_token');
      setUser(null);
    }

    api.setUnauthorizedHandler(async () => {
      const token = readDynamicAuthToken(dynamicAuthToken);
      if (isDynamicLoggedIn && token) {
        console.warn(' API 401 detected: Attempting silent session re-sync...');
        const result = await syncWithDynamic(token);
        return result.success;
      }
      return false;
    });

    return () => api.setUnauthorizedHandler(null);
  }, [dynamicAuthToken, isDynamicLoggedIn, sdkHasLoaded, syncWithDynamic, user, loading]);

  const value = {
    user,
    loading,
    error,
    logout,
    syncWithDynamic,
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
