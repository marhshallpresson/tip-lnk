/**
 * Elite TipLnk Universal Deep Linking
 * Forces mobile browsers to route into secure Solana in-app browsers.
 */

export const getPhantomDeepLink = (url) => {
  try {
    const target = new URL(url);
    target.searchParams.set('autoConnect', 'true');
    return `https://phantom.app/ul/browse/${encodeURIComponent(target.toString())}`;
  } catch (e) {
    const cleanUrl = url.split('#')[0].split('?')[0];
    return `https://phantom.app/ul/browse/${encodeURIComponent(cleanUrl)}`;
  }
};

export const getSolflareDeepLink = (url) => {
  try {
    const target = new URL(url);
    target.searchParams.set('autoConnect', 'true');
    return `https://solflare.com/ul/v1/browse/${encodeURIComponent(target.toString())}`;
  } catch (e) {
    const cleanUrl = url.split('#')[0].split('?')[0];
    return `https://solflare.com/ul/v1/browse/${encodeURIComponent(cleanUrl)}`;
  }
};

export const getJupiterDeepLink = (url) => {
  try {
    const target = new URL(url);
    return `https://jup.ag/browse/${encodeURIComponent(target.toString())}`; // Example deep link schema, adjust if official Jupiter Mobile schema is different
  } catch (e) {
    const cleanUrl = url.split('#')[0].split('?')[0];
    return `https://jup.ag/browse/${encodeURIComponent(cleanUrl)}`;
  }
};

export const getBackpackDeepLink = (url) => {
  try {
    const target = new URL(url);
    return `backpack://browse/${encodeURIComponent(target.toString())}`;
  } catch (e) {
    const cleanUrl = url.split('#')[0].split('?')[0];
    return `backpack://browse/${encodeURIComponent(cleanUrl)}`;
  }
};

export const getSolanaPayUri = (creatorAddress, amount, inputTokenMint) => {
  const isProd = import.meta.env.PROD;
  const baseUrl = isProd ? 'https://tiplnk.me' : window.location.origin;
  
  // Construct the Action URL. The backend handles the exact mint and amount.
  const actionUrl = new URL(`${baseUrl}/api/solana/actions/tip/${creatorAddress}`);
  if (amount) actionUrl.searchParams.set('amount', amount.toString());
  // In a full implementation we'd pass token as well if the action backend supported it, 
  // but for now the backend action tip defaults to native SOL in its current state, or we could pass `spl-token` if we update the backend.
  // We'll pass it anyway for future-proofing or if the action handler supports it.
  if (inputTokenMint && inputTokenMint !== 'So11111111111111111111111111111111111111112') {
     actionUrl.searchParams.set('spl-token', inputTokenMint);
  }

  // Solana Pay transaction request protocol
  return `solana:${encodeURIComponent(actionUrl.toString())}`;
};

export const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const hasSolanaProvider = () => {
  return !!(window.solana || window.solflare || window.phantom?.solana || window.backpack || window.jupiter);
};
