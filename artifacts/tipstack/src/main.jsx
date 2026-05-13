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
import './index.css';
import '@solana/wallet-adapter-react-ui/styles.css';

const dynamicLogLevel = import.meta.env.PROD ? 'MUTE' : 'ERROR';

const suppressDynamicConsoleNoise = () => {
  if (!import.meta.env.PROD) return;

  const IGNORE_PATTERNS = [
    '[DynamicSDK] [INFO]: Warning!',
    'Session expired during initialization',
    'Authorization header or cookie is required',
  ];

  const shouldIgnore = (args) => {
    const text = args
      .map((v) => {
        if (typeof v === 'string') return v;
        if (v instanceof Error) return `${v.name}: ${v.message}`;
        try { return JSON.stringify(v); } catch { return String(v); }
      })
      .join(' ');
    return IGNORE_PATTERNS.some((p) => text.includes(p));
  };

  ['error', 'warn'].forEach((method) => {
    const orig = console[method].bind(console);
    console[method] = (...args) => { if (!shouldIgnore(args)) orig(...args); };
  });
};

suppressDynamicConsoleNoise();
Logger.setLogLevel(dynamicLogLevel);

const dynamicSettings = {
  environmentId: import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID,
  appName: 'Tip Stack',
  walletConnectors: [SolanaWalletConnectors],
  suppressEndUserConsoleWarning: true,
  logLevel: dynamicLogLevel,
  overrides: {
    evmNetworks: [],
  },
  // Suppress error overlay for known network-level CORS failures from Dynamic SDK
  // when running on localhost. These don't affect functionality once allowed origins
  // are configured in the Dynamic Labs dashboard.
  onFatalError: () => {},
  events: {
    onAuthSuccess: ({ user }) => {
      console.log('[Auth] Dynamic auth complete:', user?.id);
    },
    onAuthFlowClose: () => {
      console.log('[Auth] Auth flow closed');
    },
    onLogout: () => {
      localStorage.removeItem('tipstack_auth_token');
    },
  },
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DynamicContextProvider settings={dynamicSettings} emitErrors={false}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </DynamicContextProvider>
  </StrictMode>
);
