import nacl from 'tweetnacl'
import bs58 from 'bs58'

/**
 * Safe encryption — generates a fresh random nonce per call.
 * Mandatory Task 3.1 Hardening.
 */
export function encryptMessage(
  message: Uint8Array,
  recipientPublicKey: Uint8Array,
  senderSecretKey: Uint8Array
): { encrypted: Uint8Array; nonce: Uint8Array } {
  const nonce = nacl.randomBytes(nacl.box.nonceLength)
  const encrypted = nacl.box(message, nonce, recipientPublicKey, senderSecretKey)
  if (!encrypted) throw new Error('Encryption failed')
  return { encrypted, nonce }
}

export function decryptMessage(
  encrypted: Uint8Array,
  nonce: Uint8Array,
  senderPublicKey: Uint8Array,
  recipientSecretKey: Uint8Array
): Uint8Array {
  const decrypted = nacl.box.open(encrypted, nonce, senderPublicKey, recipientSecretKey)
  if (!decrypted) throw new Error('Decryption failed — bad key or tampered ciphertext')
  return decrypted
}

/**
 * Wallet message signing (for authentication challenges - SIWS)
 */
export function signMessage(message: string, secretKey: Uint8Array): string {
  const messageBytes = new TextEncoder().encode(message)
  const signature = nacl.sign.detached(messageBytes, secretKey)
  return bs58.encode(signature)
}

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
    return false
  }
}
