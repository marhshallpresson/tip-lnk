/**
 * Professional Backend Integration Service
 * Redirects all database operations through our high-performance local backend.
 */

import api from '../lib/api';

export async function saveProfile(walletAddress, profileData, signature = null, message = null) {
  const res = await api.post('/solana/profile/update', { 
    walletAddress, 
    profile: profileData, 
    signature, 
    message 
  });
  return res.data;
}

export async function getProfile(walletAddress) {
  const res = await api.get(`/solana/profile/get?wallet=${walletAddress}`);
  return res.data?.profile || null;
}

