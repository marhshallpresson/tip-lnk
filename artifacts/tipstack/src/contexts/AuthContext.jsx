import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { useDynamicContext, useIsLoggedIn } from '@dynamic-labs/sdk-react-core';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { authToken, sdkHasLoaded, handleLogOut: dynamicLogout } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();

  const clearLocalSession = useCallback(() => {
    api.setAccessToken(null);
    localStorage.removeItem('tipstack_auth_token');
    setUser(null);
  }, []);

  const fetchMe = useCallback(async () => {
    if (!api.accessToken) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, ok } = await api.get('/auth/me');
      if (ok && data?.success) {
        setUser(data.user);
        localStorage.setItem('tipstack_auth_token', api.accessToken);
      } else {
        clearLocalSession();
      }
    } catch {
      console.debug('[Auth] No active session found.');
      clearLocalSession();
    } finally {
      setLoading(false);
    }
  }, [clearLocalSession]);

  useEffect(() => {
    const storedToken = localStorage.getItem('tipstack_auth_token');
    if (storedToken) {
      api.setAccessToken(storedToken);
    }
    fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    if (sdkHasLoaded && !isLoggedIn && user && !loading) {
      console.warn('[Auth] Dynamic session lost — clearing local session.');
      clearLocalSession();
    }
  }, [sdkHasLoaded, isLoggedIn, user, loading, clearLocalSession]);

  const syncWithDynamic = useCallback(async (dynamicJwt) => {
    if (!dynamicJwt) return { success: false };
    try {
      setLoading(true);
      setError(null);
      api.setAccessToken(null);
      localStorage.removeItem('tipstack_auth_token');
      const { data, ok } = await api.post('/auth/dynamic-verify', { dynamicJwt });
      if (ok && data?.success) {
        api.setAccessToken(data.auth.accessToken);
        localStorage.setItem('tipstack_auth_token', data.auth.accessToken);
        setUser(data.user);
        return { success: true, user: data.user };
      }
      const errorMsg = data?.error || 'Authentication failed.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } catch (err) {
      console.error('[Auth] Sync error:', err);
      setError('A network error occurred during authentication.');
      return { success: false, error: 'Network error' };
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    api.setUnauthorizedHandler(async () => {
      if (isLoggedIn && authToken) {
        console.warn('[Auth] 401 detected — attempting silent re-sync.');
        const result = await syncWithDynamic(authToken);
        return result.success;
      }
      return false;
    });
    return () => api.setUnauthorizedHandler(null);
  }, [isLoggedIn, authToken, syncWithDynamic]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('[Auth] Logout request failed:', err);
    } finally {
      clearLocalSession();
      dynamicLogout();
      window.location.href = '/';
    }
  }, [clearLocalSession, dynamicLogout]);

  const value = {
    user,
    loading,
    error,
    logout,
    syncWithDynamic,
    refreshUser: fetchMe,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
