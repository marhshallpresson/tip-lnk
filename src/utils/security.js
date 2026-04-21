import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

/**
 * Professional Security Utilities
 * Implements cryptographic verification and precise mathematical operations.
 */

/**
 * Validates a Solana address for correct format and base58 encoding.
 */
export function isValidAddress(address) {
  if (!address || typeof address !== 'string') return false;
  try {
    const decoded = bs58.decode(address);
    if (decoded.length !== 32) return false;
    new PublicKey(address); 
    return true;
  } catch {
    return false;
  }
}

/**
 * High-Precision Math (Checked Pattern)
 * Uses BigInt to eliminate floating point rounding errors in token math.
 */
export function toLamports(amount, decimals) {
  if (!amount) return BigInt(0);
  const [integer, fractional = ''] = amount.toString().split('.');
  const paddedFractional = fractional.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(integer) * BigInt(Math.pow(10, decimals)) + BigInt(paddedFractional);
}

export function fromLamports(lamports, decimals) {
  if (typeof lamports === 'string') lamports = BigInt(lamports);
  const s = lamports.toString().padStart(decimals + 1, '0');
  const integer = s.slice(0, -decimals);
  const fractional = s.slice(-decimals).replace(/0+$/, '');
  return fractional ? `${integer}.${fractional}` : integer;
}

/**
 * Cryptographic Proof Verification (Ed25519)
 * Used for off-chain identity binding and API authentication.
 */
export async function verifySignature(publicKey, message, signature) {
  try {
    const { sign } = await import('tweetnacl');
    const msgUint8 = new TextEncoder().encode(message);
    const pubKeyUint8 = bs58.decode(publicKey);
    const sigUint8 = bs58.decode(signature);
    
    return sign.detached.verify(msgUint8, sigUint8, pubKeyUint8);
  } catch (error) {
    console.error('Crypto Verification Fault:', error);
    return false;
  }
}

/**
 * Generates a unique challenge for identity verification
 * In production, this should be fetched from a backend to prevent replay attacks.
 */
export function generateChallenge(walletAddress) {
  const nonce = Math.random().toString(36).substring(2, 15);
  return ` Auth Challenge\nWallet: ${walletAddress}\nNonce: ${nonce}\nExpires: ${Date.now() + 600000}`;
}
