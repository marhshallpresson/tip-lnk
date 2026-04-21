import crypto from 'crypto'

export const hashPassword = async (password: string): Promise<string> => {
  const salt = crypto.randomBytes(16)
  const scryptAsync = (password: string, salt: Buffer, keylen: number) =>
    new Promise<Buffer>((resolve, reject) => {
      crypto.scrypt(password, salt, keylen, (err, derivedKey) => {
        if (err) reject(err)
        else resolve(derivedKey as Buffer)
      })
    })
  const hash = await scryptAsync(password, salt, 32)
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`
}

export const verifyPassword = async (password: string, stored: string): Promise<boolean> => {
  const parts = stored.split('$')
  if (parts.length !== 3) return false
  if (parts[0] !== 'scrypt') return false
  const salt = Buffer.from(parts[1], 'base64')
  const expected = Buffer.from(parts[2], 'base64')
  const scryptAsync = (password: string, salt: Buffer, keylen: number) =>
    new Promise<Buffer>((resolve, reject) => {
      crypto.scrypt(password, salt, keylen, (err, derivedKey) => {
        if (err) reject(err)
        else resolve(derivedKey as Buffer)
      })
    })
  const derived = await scryptAsync(password, salt, expected.length)
  if (derived.length !== expected.length) return false
  return crypto.timingSafeEqual(derived, expected)
}

export const sha256Hex = (s: string): string => crypto.createHash('sha256').update(s).digest('hex')
export const randomToken = (): string => crypto.randomBytes(32).toString('hex')
export const randomCode = (digits = 6): string => {
  const max = 10 ** digits
  const num = crypto.randomInt(0, max)
  return String(num).padStart(digits, '0')
}
