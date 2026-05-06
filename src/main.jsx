import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Buffer } from 'buffer';
import App from './App';
import './index.css';
import '@solana/wallet-adapter-react-ui/styles.css';

// Manual Buffer polyfill for production stability
if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>
);
