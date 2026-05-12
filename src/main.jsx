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

  const shouldIgnore = (args) => {
    const text = args
      .map((value) => {
        if (typeof value === 'string') return value;
        if (value instanceof Error) return `${value.name}: ${value.message}`;
        try {
          return JSON.stringify(value);
        } catch {
          return String(value);
        }
      })
      .join(' ');

    return (
      text.includes('[DynamicSDK] [INFO]: Warning!') ||
      text.includes('Session expired during initialization') ||
      text.includes('Authorization header or cookie is required')
    );
  };

  const wrap = (methodName) => {
    const original = console[methodName].bind(console);
    console[methodName] = (...args) => {
      if (shouldIgnore(args)) return;
      original(...args);
    };
  };

  wrap('error');
  wrap('warn');
};

suppressDynamicConsoleNoise();
Logger.setLogLevel(dynamicLogLevel);

const dynamicSettings = {
  environmentId: import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID,
  appName: 'Tip Stack',
  walletConnectors: [SolanaWalletConnectors],
  suppressEndUserConsoleWarning: true,
  logLevel: dynamicLogLevel,
  events: {
    onAuthSuccess: ({ user }) => {
      console.log('[Auth] Full auth complete:', user?.id);
    },
    onAuthFlowClose: () => {
      console.log('[Auth] Flow closed before completion');
    },
    onLogout: () => {
      localStorage.removeItem('tipstack_auth_token');
    }
  }
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
