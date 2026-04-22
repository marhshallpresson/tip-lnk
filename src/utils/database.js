/**
 * Professional Backend Integration Service
 * Redirects all database operations through our high-performance local backend.
 */

const isProd = import.meta.env.PROD;
const API_BASE_URL = isProd 
  ? window.location.origin 
  : (import.meta.env.VITE_API_BASE_URL );

async function safeFetch(url, options = {}) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend Error ${response.status}: ${errorText.slice(0, 100)}`);
    }
    return await response.json();
  } catch (error) {
    console.warn('Infrastructure Error:', error.message);
    return { error: true, message: error.message };
  }
}

export async function saveProfile(walletAddress, profileData, signature = null, message = null) {
  return await safeFetch(`${API_BASE_URL}/api/solana/profile/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress, profile: profileData, signature, message }),
  });
}

export async function getProfile(walletAddress) {
  const data = await safeFetch(`${API_BASE_URL}/api/solana/profile/get?wallet=${walletAddress}`);
  return data?.profile || null;
}

export async function logTip(walletAddress, tipData, isSent = false) {
  // Silent background log to our local indexer
  await safeFetch(`${API_BASE_URL}/api/solana/tips/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress, tip: tipData, isSent }),
  }).catch(() => null);
}
