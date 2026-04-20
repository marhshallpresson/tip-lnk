import { BrowserSDK, AddressType } from '@phantom/browser-sdk';

/**
 * Professional Phantom SDK Singleton
 * Hardens the connection instance to prevent handshake collisions.
 */
const PHANTOM_APP_ID = import.meta.env.VITE_PHANTOM_APP_ID || "319f5dec-a0a2-4c5e-9ae8-04408426f62b";

// Professional Normalization: Ensure redirectUrl exactly matches the registered domain
const redirectUrl = window.location.origin;

export const phantomSdk = new BrowserSDK({
  providers: ["google", "injected"],
  appId: PHANTOM_APP_ID,
  addressTypes: [AddressType.solana],
  autoConnect: true,
  authOptions: { redirectUrl },
});

export { AddressType };
