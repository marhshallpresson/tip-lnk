import nacl from 'tweetnacl'
import bs58 from 'bs58'
import crypto from 'crypto'

/**
 * Professional Cryptographic Utilities for Backend
 * Ensures identity verification and data protection within serverless functions.
 */

const ENCRYPTION_KEY = process.env.SESSION_TOKEN_SECRET || 'fallback-secret-for-dev-only-32-chars!!';

/**
 * Verify Solana cryptographic proof (SIWS)
 */
export function verifySignature(
  message: string,
  signature: string,
  publicKey: string
): boolean {
  try {
    const signatureBytes = bs58.decode(signature)
    const messageBytes = new TextEncoder().encode(message)
    const publicKeyBytes = bs58.decode(publicKey)
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes)
  } catch (err) {
    console.error('🛡️ Crypto Fault:', err)
    return false
  }
}

/**
 * Deterministic hash for address lookups without exposing raw address
 */
export function hashAddress(address: string): string {
  return crypto.createHmac('sha256', ENCRYPTION_KEY).update(address).digest('hex');
}

/**
 * AES-256-GCM Encryption for sensitive data (Zero-Knowledge at Rest)
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const salt = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * AES-256-GCM Decryption
 */
export function decrypt(hash: string): string {
  const [saltHex, ivHex, authTagHex, encryptedText] = hash.split(':');
  
  const salt = Buffer.from(saltHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, 'sha256');
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
