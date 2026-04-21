/**
 * Elite TipLnk Universal Deep Linking
 * Forces mobile browsers to route into secure Solana in-app browsers.
 */

export const getPhantomDeepLink = (url) => {
  const cleanUrl = url.split('#')[0].split('?')[0]; // Use base URL for cleaner routing
  return `https://phantom.app/ul/browse/${encodeURIComponent(url)}`;
};

export const getSolflareDeepLink = (url) => {
  return `https://solflare.com/ul/v1/browse/${encodeURIComponent(url)}`;
};

export const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const hasSolanaProvider = () => {
  return !!(window.solana || window.solflare || window.phantom?.solana);
};
