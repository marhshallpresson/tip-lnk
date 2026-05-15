const isProd = import.meta.env.MODE === 'production';

// In production, origin is the deployed domain.
// In dev, VITE_API_BASE_URL is "" so we use window.location.origin to get
// an absolute URL (required by the Solana Connection constructor).
const API_BASE_URL = isProd
  ? window.location.origin
  : (import.meta.env.VITE_API_BASE_URL || window.location.origin);

export const QUICKNODE_SOLANA_RPC = `${API_BASE_URL}/api/quicknode/rpc/solana`;

export const PROXY_API = (url) =>
  `/api/proxy?url=${encodeURIComponent(url)}`;

export const PROXY_CDN = (url) =>
  `/api/proxy-cdn?url=${encodeURIComponent(url)}`;

export const DIALECT_PROXY = `/api/dialect`;

export async function solanaRpc(method, params = []) {
  const response = await fetch(QUICKNODE_SOLANA_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || 'RPC Error');
  return data.result;
}
