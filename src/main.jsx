import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Buffer } from 'buffer';
import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core';
import { SolanaWalletConnectors } from '@dynamic-labs/solana';
import App from './App';
import './index.css';
import '@solana/wallet-adapter-react-ui/styles.css';

// Polyfill for Solana Wallet Standard / Dynamic SDK compatibility
if (typeof window !== 'undefined') {
  try {
    const nav = window.navigator;
    if (nav) {
      // Dynamic SDK hard-checks Array.isArray(navigator.wallets)
      // Some extensions inject a standard 'Wallets' object which is NOT an array.
      if (nav.wallets && !Array.isArray(nav.wallets)) {
        console.warn('Dynamic Fix: navigator.wallets is defined but not an array. Forcing Proxy wrapper...');
        try {
          const originalWallets = nav.wallets;
          // Create an actual array to pass Array.isArray()
          const arrayProxy = Object.assign([], {
            // Forward common methods if they exist
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
        } catch (redefineErr) {
          console.error('Failed to redefine navigator.wallets:', redefineErr);
        }
      }
      
      if (typeof nav.wallets === 'undefined') {
        Object.defineProperty(nav, 'wallets', {
          value: [],
          configurable: true,
          enumerable: true,
          writable: true
        });
      }
    }
  } catch (e) {
    console.debug('navigator.wallets polyfill skipped:', e);
  }
}

// Manual Buffer polyfill for production stability
if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer;
}

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
