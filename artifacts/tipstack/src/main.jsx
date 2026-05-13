import { Buffer } from 'buffer';
window.Buffer = Buffer;
window.global = window;

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core';
import { SolanaWalletConnectors } from '@dynamic-labs/solana';
import { Logger } from '@dynamic-labs/logger';
import App from './App';
import { authEvents } from './lib/auth-events';
import './index.css';
import '@solana/wallet-adapter-react-ui/styles.css';

const dynamicLogLevel = import.meta.env.PROD ? 'MUTE' : 'WARN';

/**
 * Suppress SDK console noise that is expected and handled gracefully:
 * - "Session expired during initialization" — normal on page load when no prior session
 * - "Failed to revoke session" — normal when there's no active Dynamic session to clean up
 * - "Authorization header or cookie is required" — Dynamic's own internal API calls during
 *   the auth flow before the JWT is fully set (known SDK timing issue in v4.x)
 */
const SUPPRESS_PATTERNS = [
  'Session expired during initialization',
  'Failed to revoke session',
  'Authorization header or cookie is required',
  '[DynamicSDK] [INFO]: Warning!',
];

const shouldSuppress = (args) => {
  const text = args
    .map((v) => {
      if (typeof v === 'string') return v;
      if (v instanceof Error) return `${v.name}: ${v.message}`;
      try { return JSON.stringify(v); } catch { return String(v); }
    })
    .join(' ');
  return SUPPRESS_PATTERNS.some((p) => text.includes(p));
};

['error', 'warn'].forEach((method) => {
  const orig = console[method].bind(console);
  console[method] = (...args) => { if (!shouldSuppress(args)) orig(...args); };
});

Logger.setLogLevel(dynamicLogLevel);

/**
 * Dynamic SDK settings following v4 React SDK patterns.
 *
 * Auth flow:
 *  1. User opens the Dynamic modal (setShowAuthFlow(true))
 *  2. User completes authentication (wallet, email OTP, Google OAuth, etc.)
 *  3. onAuthSuccess fires → we emit 'authSuccess' on the bridge
 *  4. AuthContext picks it up, grabs the fresh JWT via authToken, calls /auth/dynamic-verify
 *  5. Backend verifies JWT with JWKS, upserts user record, returns our session token
 *
 * Fallback path (page reload with existing Dynamic session):
 *  - sdkHasLoaded + isLoggedIn + authToken watcher in AuthContext handles restore
 */
const dynamicSettings = {
  environmentId: import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID,
  appName: 'Tip Stack',
  walletConnectors: [SolanaWalletConnectors],
  suppressEndUserConsoleWarning: true,
  logLevel: dynamicLogLevel,
  // Add explicit WaaS configuration
  embeddedWallets: {
    automaticEmbeddedWalletCreation: true,
  },
  // Explicitly enable WaaS infrastructure
  waas: {
    enabled: true,
  },
  overrides: {
    evmNetworks: [],
  },
  // Silently absorb fatal SDK errors (e.g. network failures on CORS-restricted origins)
  // so they don't bubble up as unhandled rejections.
  onFatalError: () => {},
  events: {
    /**
     * Primary auth trigger. Fires once Dynamic has fully verified the user.
     * authToken in useDynamicContext() will be set at this point.
     */
    onAuthSuccess: ({ user }) => {
      console.log('[Dynamic] onAuthSuccess — userId:', user?.id);
      authEvents.emit('authSuccess', { dynamicUser: user });
    },

    /**
     * Fires when the auth modal closes without completion.
     * We still check if a token appeared (partial flows can set authToken
     * even when the modal closes "early" e.g. wallet-only flows on v4.83).
     */
    onAuthFlowClose: () => {
      console.log('[Dynamic] Auth flow closed');
      authEvents.emit('authFlowClose', {});
    },

    /**
     * Fires when the user logs out of Dynamic.
     * Clear our local session tokens so the two sessions stay in sync.
     */
    onLogout: () => {
      console.log('[Dynamic] onLogout');
      localStorage.removeItem('tipstack_auth_token');
      authEvents.emit('logout', {});
    },
  },
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DynamicContextProvider settings={dynamicSettings} emitErrors={false}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </BrowserRouter>
    </DynamicContextProvider>
  </StrictMode>
);
