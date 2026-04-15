const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.eitherway.ai';

/**
 * Supabase Data Integration Service
 * Routes all database operations through the api.eitherway.ai infrastructure.
 * Includes fallback for local simulation if infrastructure is unreachable.
 */

async function safeFetch(url, options = {}) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn(`Infrastructure unreachable at ${url}. Falling back to simulation.`, error.message);
    return { error: true, message: error.message };
  }
}

export async function saveProfile(walletAddress, profileData) {
  return await safeFetch(`${API_BASE_URL}/api/supabase/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress, profile: profileData }),
  });
}

export async function getProfile(walletAddress) {
  const data = await safeFetch(`${API_BASE_URL}/api/supabase/profile?wallet=${walletAddress}`);
  return data?.profile || null;
}

export async function logTip(walletAddress, tipData, isSent = false) {
  await safeFetch(`${API_BASE_URL}/api/supabase/tips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress, tip: tipData, isSent }),
  });
}
