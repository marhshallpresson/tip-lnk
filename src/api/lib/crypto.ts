import nacl from 'tweetnacl'
import bs58 from 'bs58'
import crypto from 'crypto'

const ENCRYPTION_KEY = (process.env.SESSION_TOKEN_SECRET || process.env.SESSION_SECRET || process.env.JWT_SECRET) as string
if (!ENCRYPTION_KEY) {
  throw new Error('SESSION_TOKEN_SECRET, SESSION_SECRET, or JWT_SECRET must be set for cryptographic operations.')
}

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
  } catch {
    return false
  }
}

export function hashAddress(address: string): string {
  return crypto.createHmac('sha256', ENCRYPTION_KEY).update(address).digest('hex');
}

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
