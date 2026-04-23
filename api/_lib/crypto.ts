import nacl from 'tweetnacl'
import bs58 from 'bs58'

/**
 * Professional Cryptographic Utilities for Backend
 * Ensures identity verification and data protection within serverless functions.
 */

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
