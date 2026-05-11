import { Buffer } from 'buffer';
window.Buffer = Buffer;
window.global = window;

// ─── ELITE SECURITY: EARLY-BOOT SESSION PURGE ───
// Force clear dead tokens BEFORE SDK initializes to prevent initialization loops.
const envId = import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID;
if (envId) {
    const keys = Object.keys(localStorage);
    keys.forEach(k => {
        if ((k.includes('session') || k.includes('dynamic')) && k.includes(envId)) {
            try {
                const item = localStorage.getItem(k);
                if (item) {
                    const session = JSON.parse(item);
                    const expiration = session?.value?.sessionExpiration;
                    if (!session?.value?.token || (expiration && expiration < Date.now())) {
                        localStorage.removeItem(k);
                        console.log(`[Auth] Purged stale session: ${k}`);
                    }
                }
            } catch(e) {
                localStorage.removeItem(k);
            }
        }
    });
}

import { StrictMode, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { DynamicContextProvider, useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { SolanaWalletConnectors } from '@dynamic-labs/solana';
import App from './App';
import './index.css';
import '@solana/wallet-adapter-react-ui/styles.css';

export function AuthCircuitBreaker() {
  const { sdkHasLoaded } = useDynamicContext();
  const hasChecked = useRef(false);

  useEffect(() => {
    if (!sdkHasLoaded || hasChecked.current) return;
    hasChecked.current = true;

    const envId = import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID;
    const sessionKey = Object.keys(localStorage).find(k => 
      k.includes('session') && k.includes(envId)
    );
    
    if (sessionKey) {
      try {
        const session = JSON.parse(localStorage.getItem(sessionKey) || '{}');
        const token = session?.value?.token;
        const expiration = session?.value?.sessionExpiration;
        const now = Date.now();

        if (!token || (expiration && expiration < now)) {
          // Dead session — clear it so SDK stops retrying refresh
          localStorage.removeItem(sessionKey);
          console.log('[Auth] Cleared expired/empty session to stop refresh loop');
        }
      } catch (e) {
        console.error('[Auth] Failed to parse session:', e);
      }
    }
  }, [sdkHasLoaded]);

  return null;
}

const dynamicSettings = {
  environmentId: import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID,
  appName: 'Tip Stack',
  // Configure cookie-based auth proxy
  apiBaseUrl: 'https://tipstack.fun/api/v0', 
  walletConnectors: [SolanaWalletConnectors],
  persistWalletSession: true,
  eventsCallbacks: {
    onAuthSuccess: ({ authToken, user, primaryWallet }) => {
      // Only fires when scope is "authenticated" and token is real
      // Safe to trigger post-auth logic here
      console.log('[Auth] Full auth complete:', user?.id);
    },
    onAuthFlowClose: () => {
      // User closed modal mid-flow (still in userDataForm scope)
      // Do NOT make any API calls here
      console.log('[Auth] Flow closed before completion');
    },
    onLogout: () => {
      // Clear any app-level auth state
      localStorage.removeItem('tipstack_auth_token');
    },
    onSessionConnect: ({ authToken }) => {
      console.log('[Auth] Session restored successfully');
    },
    onSessionReject: () => {
      // Stale/expired session — clear it and let user re-auth
      console.log('[Auth] Session rejected, clearing state');
      const keys = Object.keys(localStorage).filter(k => 
        k.includes('dynamic') && k.includes('session')
      );
      keys.forEach(k => localStorage.removeItem(k));
    }
  }
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DynamicContextProvider
      settings={dynamicSettings}
      loadingTimeout={30000}
      recoveryTimeout={20000}
    >
      <AuthCircuitBreaker />
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App />
      </BrowserRouter>
    </DynamicContextProvider>
  </StrictMode>
);
