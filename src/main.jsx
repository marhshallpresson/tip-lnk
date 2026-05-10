import { Buffer } from 'buffer';

// ─── ELITE SECURITY: GLOBAL POLYFILLS ───
// Must be executed BEFORE any other library initialization.
if (typeof window !== 'undefined') {
  // 1. Buffer Stability
  if (!window.Buffer) {
    window.Buffer = Buffer;
  }

  // 2. globalThis Shim
  if (typeof window['global'] === 'undefined') {
    window['global'] = window;
  }

  // 3. Solana Wallet Standard (Dynamic SDK Compatibility)
  try {
    const nav = window.navigator;
    if (nav) {
      // Ensure 'wallets' is an array as expected by Dynamic SDK
      if (nav['wallets'] && !Array.isArray(nav['wallets'])) {
        console.warn('🛡️ Auth Stability: Wrapping navigator.wallets for standard compatibility.');
        const originalWallets = nav.wallets;
        try {
          const arrayProxy = Object.assign([], {
            on: typeof originalWallets.on === 'function' ? originalWallets.on.bind(originalWallets) : undefined,
            get: typeof originalWallets.get === 'function' ? originalWallets.get.bind(originalWallets) : undefined,
            register: typeof originalWallets.register === 'function' ? originalWallets.register.bind(originalWallets) : undefined,
          });
          
          Object.defineProperty(nav, 'wallets', {
            value: arrayProxy,
            configurable: true,
            enumerable: true,
            writable: true
          });
        } catch (e) {
          console.debug('navigator.wallets wrap skipped:', e);
        }
      } else if (typeof nav.wallets === 'undefined') {
        try {
          Object.defineProperty(nav, 'wallets', {
            value: [],
            configurable: true,
            enumerable: true,
            writable: true
          });
        } catch (e) {
          nav.wallets = []; // Fallback for simple assignment
        }
      }
    }
  } catch (e) {
    console.debug('Auth polyfills skipped:', e);
  }
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core';
import { SolanaWalletConnectors } from '@dynamic-labs/solana';
import App from './App';
import './index.css';
import '@solana/wallet-adapter-react-ui/styles.css';

const dynamicSettings = {
  environmentId: import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID,
  appName: 'Tip Stack',
  walletConnectors: [SolanaWalletConnectors],
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DynamicContextProvider
      settings={dynamicSettings}
      loadingTimeout={30000}
      recoveryTimeout={20000}
    >
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App />
      </BrowserRouter>
    </DynamicContextProvider>
  </StrictMode>
);
