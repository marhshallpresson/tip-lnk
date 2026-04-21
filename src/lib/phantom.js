import { BrowserSDK, AddressType } from '@phantom/browser-sdk';

/**
 * Professional Phantom SDK Singleton
 * Hardens the connection instance to prevent handshake collisions.
 */
const PHANTOM_APP_ID = import.meta.env.VITE_PHANTOM_APP_ID;

// Professional Hardening: Exact string match from your Phantom Developer Dashboard
const appUrl = import.meta.env.VITE_APP_URL?.replace(/\/$/, '') || window.location.origin;
const redirectUrl = `${appUrl}/auth/callback/phantom-google`;

export const phantomSdk = new BrowserSDK({
  providers: ["google", "injected"],
  appId: PHANTOM_APP_ID,
  addressTypes: [AddressType.solana],
  autoConnect: true,
  authOptions: { redirectUrl },
});

export { AddressType };
