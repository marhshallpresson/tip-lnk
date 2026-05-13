import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/api';
import { useDynamicContext, useIsLoggedIn } from '@dynamic-labs/sdk-react-core';
import { authEvents } from '../lib/auth-events';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { authToken, sdkHasLoaded, handleLogOut: dynamicLogout } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();

  // Keep a ref so event callbacks always see the latest token without stale closure issues
  const authTokenRef = useRef(authToken);
  useEffect(() => { authTokenRef.current = authToken; }, [authToken]);

  // Track in-flight sync to prevent duplicate calls
  const syncInFlightRef = useRef(false);
  const lastSyncedTokenRef = useRef(null);

  const clearLocalSession = useCallback(() => {
    api.setAccessToken(null);
    localStorage.removeItem('tipstack_auth_token');
    setUser(null);
    setError(null);
    lastSyncedTokenRef.current = null;
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

  /**
   * Core sync function: sends the Dynamic JWT to our backend, which verifies it
   * via JWKS and returns a local session token. This is the hand-off point between
   * Dynamic's identity layer and our own session management.
   *
   * Per Dynamic docs: the JWT from authToken / getAuthToken() is the correct value
   * to pass to your backend for server-side verification using the JWKS endpoint:
   * https://app.dynamic.xyz/api/v0/sdk/{envId}/.well-known/jwks
   */
  const syncWithDynamic = useCallback(async (dynamicJwt) => {
    if (!dynamicJwt) return { success: false, error: 'No JWT provided' };
    if (syncInFlightRef.current) {
      console.debug('[Auth] Sync already in flight, skipping.');
      return { success: false, error: 'Sync in flight' };
    }
    if (lastSyncedTokenRef.current === dynamicJwt) {
      console.debug('[Auth] Token already synced, skipping.');
      return { success: false, error: 'Token already synced' };
    }

    try {
      syncInFlightRef.current = true;
      setLoading(true);
      setError(null);

      // Clear any stale local session before syncing fresh Dynamic identity
      api.setAccessToken(null);
      localStorage.removeItem('tipstack_auth_token');

      const { data, ok } = await api.post('/auth/dynamic-verify', { dynamicJwt });

      if (ok && data?.success) {
        lastSyncedTokenRef.current = dynamicJwt;
        api.setAccessToken(data.auth.accessToken);
        localStorage.setItem('tipstack_auth_token', data.auth.accessToken);
        setUser(data.user);
        console.log('[Auth] Sync complete — userId:', data.user?.id);
        return { success: true, user: data.user };
      }

      const errorMsg = data?.error || 'Authentication failed.';
      setError(errorMsg);
      console.error('[Auth] Dynamic verify failed:', errorMsg);
      return { success: false, error: errorMsg };
    } catch (err) {
      console.error('[Auth] Sync network error:', err);
      setError('A network error occurred during authentication.');
      return { success: false, error: 'Network error' };
    } finally {
      syncInFlightRef.current = false;
      setLoading(false);
    }
  }, []);

  // ─── STARTUP: restore session from localStorage ─────────────────────────────
  useEffect(() => {
    const storedToken = localStorage.getItem('tipstack_auth_token');
    if (storedToken) {
      api.setAccessToken(storedToken);
    }
    fetchMe();
  }, [fetchMe]);

  // ─── PRIMARY TRIGGER: onAuthSuccess event from Dynamic ───────────────────────
  // Dynamic fires onAuthSuccess once the user has fully authenticated.
  // We wait up to 1.5 seconds for authToken to propagate into React context,
  // then call syncWithDynamic. This handles all Dynamic auth flows:
  // wallet-only, email-only, Google OAuth, and combined flows.
  useEffect(() => {
    const off = authEvents.on('authSuccess', async ({ dynamicUser }) => {
      console.log('[Auth] authSuccess event received — dynamic userId:', dynamicUser?.id);

      // Increase polling duration for authToken to appear in context
      // v4 WaaS initialization can take longer due to iframe handshake
      let token = authTokenRef.current;
      if (!token) {
        for (let i = 0; i < 15; i++) { // Increase to 1.5s max wait
          await new Promise((r) => setTimeout(r, 100));
          token = authTokenRef.current;
          if (token) break;
        }
      }

      if (token) {
        await syncWithDynamic(token);
      } else {
        console.warn('[Auth] onAuthSuccess fired but no authToken available after 1500 ms wait.');
      }
    });
    return off;
  }, [syncWithDynamic]);

  // ─── SECONDARY TRIGGER: authFlowClose with token present ────────────────────
  // Handles edge cases where onAuthSuccess doesn't fire (e.g. wallet-only users
  // in Dynamic v4.83 where updateUserProfileFields fails internally) but the
  // JWT was still issued and authToken is available in context.
  useEffect(() => {
    const off = authEvents.on('authFlowClose', async () => {
      const token = authTokenRef.current;
      if (token && !user && !syncInFlightRef.current) {
        console.log('[Auth] authFlowClose — token present, attempting sync as fallback.');
        await syncWithDynamic(token);
      }
    });
    return off;
  }, [syncWithDynamic, user]);

  // ─── TERTIARY TRIGGER: page reload with existing Dynamic session ─────────────
  // When a user reloads the page, Dynamic re-establishes their session and sets
  // isLoggedIn=true + authToken. If our local session is gone (expired cookie /
  // cleared localStorage) we need to re-sync.
  useEffect(() => {
    if (!sdkHasLoaded || !isLoggedIn || !authToken || user || loading) return;
    if (lastSyncedTokenRef.current === authToken) return;
    if (syncInFlightRef.current) return;

    console.log('[Auth] Page reload — Dynamic session found, re-syncing backend session.');
    syncWithDynamic(authToken);
  }, [sdkHasLoaded, isLoggedIn, authToken, user, loading, syncWithDynamic]);

  // ─── CLEANUP: Dynamic logout ─────────────────────────────────────────────────
  useEffect(() => {
    if (sdkHasLoaded && !isLoggedIn && user && !loading) {
      console.warn('[Auth] Dynamic session lost — clearing local session.');
      clearLocalSession();
    }
  }, [sdkHasLoaded, isLoggedIn, user, loading, clearLocalSession]);

  // ─── SILENT RE-SYNC on 401 ───────────────────────────────────────────────────
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
