import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

const AuthContext = createContext();

export const purgeStaleDynamicSession = () => {
  const sessionKey = Object.keys(localStorage).find(
    k => k.includes('dynamic') && k.includes('session') && 
         k.includes('3fbb3eed')
  );
  if (!sessionKey) return;

  try {
    const raw = localStorage.getItem(sessionKey);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const expiration = parsed?.value?.sessionExpiration;
    
    // CONSERVATIVE PURGE: Only delete if the expiration is definitively in the past.
    // We allow token: null if the expiration is in the future to avoid breaking OAuth redirects.
    const isExpired = expiration && expiration < Date.now();

    if (isExpired) {
      localStorage.removeItem(sessionKey);
      console.log(`[Auth] Purged stale session (expired): ${sessionKey}`);
    }
  } catch (e) {
    console.warn('[Auth] Failed to parse session key during purge check:', e);
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Early-mount stale session purge (circuit breaker)
  useEffect(() => {
    purgeStaleDynamicSession();
  }, []);

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

  const dynamicContext = useDynamicContext();
  const dynamicLogout = dynamicContext?.handleLogout;

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout request failed:', err);
    } finally {
      // ─── ELITE IDENTITY SYNC: UNIFIED LOGOUT ───
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
    if (!dynamicJwt) return { success: false };
    
    try {
      setLoading(true);
      setError(null);

      // ΓööΓöÇΓöÇ ELITE SECURITY: CLEAR STALE SESSIONS ΓööΓöÇΓöÇ
      // Before syncing a new Dynamic identity, we MUST clear any old local session
      // to avoid 401 errors from the API instance trying to use an expired token.
      api.setAccessToken(null);
      localStorage.removeItem('tipstack_auth_token');

      const { data, ok } = await api.post('/auth/dynamic-verify', { dynamicJwt });
      
      if (ok && data.success) {
        api.setAccessToken(data.auth.accessToken);
        localStorage.setItem('tipstack_auth_token', data.auth.accessToken);
        setUser(data.user);
        return { success: true, user: data.user };
      }
      
      const errorMsg = data.error || 'Identity synchronization failed.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } catch (err) {
      console.error('≡ƒ¢í∩╕Å Auth Sync Error:', err);
      setError('A network error occurred during authentication.');
      return { success: false, error: 'Network error' };
    } finally {
      setLoading(false);
    }
  }, []);

  // Bridge API unauthorized handler to Dynamic session sync
  useEffect(() => {
    const { authToken, isAuthenticated, sdkHasLoaded } = dynamicContext || {};
    
    // ΓööΓöÇΓöÇ ELITE SESSION HEALING: AUTO-LOGOUT ΓööΓöÇΓöÇ
    // If Dynamic SDK confirms the user is NOT authenticated, but we still think we are,
    // we must terminate the local session to prevent 401 noise and stale UI.
    if (sdkHasLoaded && !isAuthenticated && user && !loading) {
      console.warn('≡ƒ¢í∩╕Å Dynamic identity lost. Cleaning up TipStack session...');
      // Use local cleanup to avoid infinite redirection loops
      api.setAccessToken(null);
      localStorage.removeItem('tipstack_auth_token');
      setUser(null);
      return;
    }

    api.setUnauthorizedHandler(async () => {
      if (isAuthenticated && authToken) {
        console.warn('≡ƒ¢í∩╕Å API 401 detected: Attempting silent session re-sync...');
        const result = await syncWithDynamic(authToken);
        return result.success;
      }
      return false;
    });

    return () => api.setUnauthorizedHandler(null);
  }, [dynamicContext, syncWithDynamic, user, loading]);

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
