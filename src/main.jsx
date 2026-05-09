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
      // If it exists but is not an array, we need to handle it
      // Some extensions inject it as an object that doesn't pass Array.isArray
      if (nav.wallets && !Array.isArray(nav.wallets)) {
        console.warn('Dynamic Fix: navigator.wallets is defined but not an array. Polyfilling...');
        // We don't overwrite it if it's iterable (standard), 
        // but if Dynamic SDK specifically checks Array.isArray, this is where it fails.
      }
      
      // Safety: ensure it's at least an empty array if undefined to prevent crashes
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
