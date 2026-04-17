const isProd = import.meta.env.PROD;
// Ensure we always have a full URL for the Solana Connection constructor
const API_BASE_URL = isProd 
  ? window.location.origin 
  : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005');

export const QUICKNODE_SOLANA_RPC = `${API_BASE_URL}/api/quicknode/rpc/solana`;

export const PROXY_API = (url) =>
  `${API_BASE_URL}/api/proxy?url=${encodeURIComponent(url)}`;

export const PROXY_CDN = (url) =>
  `${API_BASE_URL}/api/proxy-cdn?url=${encodeURIComponent(url)}`;

export const DIALECT_PROXY = `${API_BASE_URL}/api/dialect`;

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