import { Router, type Request, type Response } from 'express'
import * as oidc from 'openid-client'
import { db } from '../lib/db.js'
import { sendMail } from '../lib/mailer.js'
import { templates } from '../lib/mail-templates.js'
import { hashPassword, randomCode, randomToken, sha256Hex, verifyPassword } from '../lib/password.js'
import { randomUUID } from 'crypto'
import { logError, serializeError, log } from '../lib/logger.js'
import {
  createSession,
  destroySession,
  getSessionUser,
  getCookieOptions,
  getUserRoles,
  revokeAllUserSessions
} from '../lib/session.js'
import { resolveSessionTokenSecret, signSessionToken } from '../lib/session-token.js'
import { ensureCsrfToken } from '../lib/csrf.js'
import { rateLimit } from 'express-rate-limit'
import nacl from 'tweetnacl'
import bs58 from 'bs58'

const router = Router()

// Elite Rate Limiter: Prevent brute-force on sensitive auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many authentication attempts. Please try again later.' }
});

router.use('/login', authLimiter);
router.use('/register', authLimiter);
router.use('/wallet-login', authLimiter);
router.use('/twitter/callback', authLimiter);
router.use('/discord/callback', authLimiter);
router.use('/phantom-google/callback', authLimiter);

router.get('/csrf', (req: Request, res: Response) => {
  const token = ensureCsrfToken(req, res)
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({ success: true, csrfToken: token })
})

const normalizeBaseUrl = (url: string) => url.trim().replace(/\/+$/, '')

const firstHeaderValue = (value: string | string[] | undefined) => {
  if (!value) return ''
  const raw = Array.isArray(value) ? value[0] : value
  return String(raw || '').split(',')[0]?.trim() || ''
}

const inferredOrigin = (req?: Request) => {
  if (!req) return ''
  const proto = firstHeaderValue(req.headers['x-forwarded-proto']) || req.protocol || 'https'
  const host = firstHeaderValue(req.headers['x-forwarded-host']) || req.get('host') || ''
  if (!host) return ''
  return normalizeBaseUrl(`${proto}://${host}`)
}

const hostFromAbsoluteUrl = (value: string) => {
  try {
    return new URL(value).hostname.toLowerCase()
  } catch {
    return ''
  }
}

const appUrl = (req?: Request) => {
  const env = normalizeBaseUrl(process.env.APP_URL || '')
  if (env) return normalizeBaseUrl(env)
  const fallback = inferredOrigin(req)
  if (fallback) return fallback
  return 'https://tip-lnk.vercel.app'
}

const apiUrl = (req?: Request) => {
  const env = normalizeBaseUrl(process.env.API_URL || '')
  if (env) return normalizeBaseUrl(env)
  const fallback = inferredOrigin(req)
  if (fallback) return fallback
  return appUrl(req)
}

const oauthRedirectUrl = (req?: Request) => {
  const env = normalizeBaseUrl(process.env.GOOGLE_REDIRECT_URL || '')
  const inferred = inferredOrigin(req)
  if (req && inferred) {
    const inferredHost = hostFromAbsoluteUrl(inferred)
    const envHost = hostFromAbsoluteUrl(env)
    if (env && /^https?:\/\//i.test(env) && envHost === inferredHost) return env
    return `${inferred}/api/auth/google/callback`
  }
  if (env && /^https?:\/\//i.test(env)) return env
  return `${apiUrl(req)}/api/auth/google/callback`
}

const normalizeEmail = (v: unknown) => (typeof v === 'string' ? v.trim().toLowerCase() : '')

const normalizeName = (v: unknown) => {
  if (typeof v !== 'string') return ''
  const s = v.trim()
  return s.length > 0 ? s : ''
}

const findUserByEmailInsensitive = async (email: string) => {
  const normalized = normalizeEmail(email)
  if (!normalized) return null
  return db('user')
    .whereNull('deletedAt')
    .whereRaw('LOWER(email) = ?', [normalized])
    .first()
}

const getRequestUserAgent = (req: Request) =>
  typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'].trim() : ''

const normalizeIp = (value: unknown) =>
  String(value || '')
    .split(',')[0]
    ?.trim()
    .replace(/^::ffff:/, '')

const getRequestIp = (req: Request) => {
  const xf = req.headers['x-forwarded-for']
  if (typeof xf === 'string' && xf.trim()) return normalizeIp(xf)
  return normalizeIp(req.ip || '')
}

const EXCHANGE_RETRY_WINDOW_MS = 2 * 60 * 1000

type OAuthErrorCode =
  | 'missing_state'
  | 'invalid_client'
  | 'invalid_grant'
  | 'google_disabled'
  | 'oauth_not_configured'
  | 'oauth_failed'

const readGoogleOAuthConfig = () => {
  const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim()
  const clientSecret = String(process.env.GOOGLE_CLIENT_SECRET || '').trim()
  const redirectUrl = normalizeBaseUrl(process.env.GOOGLE_REDIRECT_URL || '')

  const missing: string[] = []
  const invalid: string[] = []

  if (!clientId) missing.push('GOOGLE_CLIENT_ID')
  if (!clientSecret) missing.push('GOOGLE_CLIENT_SECRET')

  return {
    clientId,
    clientSecret,
    redirectUrl,
    missing,
    invalid,
    ok: missing.length === 0 && invalid.length === 0,
  }
}

const classifyGoogleOAuthError = (err: unknown): OAuthErrorCode => {
  const e = err as any
  const parts = [
    e?.error,
    e?.code,
    e?.message,
  ].filter(Boolean).map(v => String(v).toLowerCase()).join(' | ')

  if (parts.includes('google_oauth_not_configured')) return 'oauth_not_configured'
  if (parts.includes('google_disabled')) return 'google_disabled'
  if (parts.includes('invalid_client')) return 'invalid_client'
  if (parts.includes('invalid_grant')) return 'invalid_grant'
  if (parts.includes('state') || parts.includes('nonce')) return 'missing_state'
  return 'oauth_failed'
}

const redirectToLoginWithOAuthError = (
  req: Request,
  res: Response,
  code: OAuthErrorCode,
  nextPath?: string,
) => {
  const redirect = new URL('/login', appUrl(req))
  redirect.searchParams.set('oauth_error', code)
  const rawNext = typeof nextPath === 'string' ? nextPath.trim() : ''
  if (rawNext.startsWith('/')) {
    redirect.searchParams.set('next', rawNext)
  }
  res.redirect(redirect.toString())
}

const clearCookieOpts = (opts: Record<string, any>) => {
  const { maxAge: _maxAge, ...rest } = opts || {}
  return rest
}

let googleConfigPromise: Promise<oidc.Configuration> | null = null

const getGoogleConfig = async (): Promise<oidc.Configuration> => {
  if (googleConfigPromise) return googleConfigPromise
  googleConfigPromise = (async () => {
    const config = readGoogleOAuthConfig()
    if (!config.clientId) throw new Error('GOOGLE_OAUTH_NOT_CONFIGURED: GOOGLE_CLIENT_ID')
    if (!config.clientSecret) throw new Error('GOOGLE_OAUTH_NOT_CONFIGURED: GOOGLE_CLIENT_SECRET')
    return oidc.discovery(new URL('https://accounts.google.com'), config.clientId, config.clientSecret)
  })().catch((err) => {
    googleConfigPromise = null
    throw err
  })
  return googleConfigPromise
}

const oauthExchangeTtlMs = () => 10 * 60 * 1000

const issueAuthExchangeCode = async (sessionId: string) => {
  const code = randomToken()
  const codeHash = sha256Hex(code)
  const expiresAt = new Date(Date.now() + oauthExchangeTtlMs())

  await db('authexchangecode').where({ sessionId }).delete().catch(() => null)

  await db('authexchangecode').insert({
    id: randomUUID(),
    sessionId,
    codeHash,
    expiresAt,
    usedAt: null,
    created_at: new Date(),
  })

  return { code, expiresAt }
}

const emailVerifyTtlMs = () => 60 * 60 * 1000
const passwordResetTtlMs = () => 60 * 60 * 1000

const issueEmailVerification = async (userId: string, email: string, name: string) => {
  const code = randomCode(6)
  const tokenHash = sha256Hex(code)
  const expiresAt = new Date(Date.now() + emailVerifyTtlMs())

  await db('emailverificationtoken').where({ userId }).delete()

  await db('emailverificationtoken').insert({
    id: randomUUID(),
    userId,
    tokenHash,
    expiresAt,
    created_at: new Date(),
  })

  console.log(`[Email Verification] Code for ${email}: ${code}`)

  await sendMail({
    to: email,
    subject: 'Verify your email - TipLnk',
    text: `Your verification code is ${code}`,
    html: templates.verifyEmailCode(name, code),
  }).catch(err => {
    console.error('Failed to send verification email:', err)
  })
}

const issuePasswordReset = async (userId: string, email: string, name: string, req?: Request) => {
  const token = randomToken()
  const tokenHash = sha256Hex(token)
  const expiresAt = new Date(Date.now() + passwordResetTtlMs())

  await db('passwordresettoken').where({ userId }).delete()

  await db('passwordresettoken').insert({
    id: randomUUID(),
    userId,
    tokenHash,
    expiresAt,
    created_at: new Date(),
  })

  const link = `${appUrl(req)}/reset-password?token=${token}`

  await sendMail({
    to: email,
    subject: 'Reset your password - TipLnk',
    text: `Reset your password: ${link}`,
    html: templates.resetPassword(name || email, link),
  }).catch(err => {
    console.error('Failed to send reset email:', err)
  })
}

router.get('/google/start', async (req: Request, res: Response) => {
  const next = (req.query.next as string) || '/'
  try {
    const config = await getGoogleConfig()
    const redirect_uri = oauthRedirectUrl(req)
    const state = oidc.randomState()
    const verifier = oidc.randomPKCECodeVerifier()
    const nonce = oidc.randomNonce()
    const code_challenge = await oidc.calculatePKCECodeChallenge(verifier)

    const opts = getCookieOptions(req)
    const shortOpts = { ...opts, maxAge: 600000 }

    res.cookie('g_state', state, shortOpts)
    res.cookie('g_verifier', verifier, shortOpts)
    res.cookie('g_nonce', nonce, shortOpts)
    res.cookie('g_next', next, shortOpts)

    const url = oidc.buildAuthorizationUrl(config, {
      redirect_uri,
      scope: 'openid email profile',
      state,
      nonce,
      code_challenge,
      code_challenge_method: 'S256',
    })

    res.redirect(url.href)
  } catch (e: any) {
    console.error('[auth/google/start]', e)
    const oauthError = classifyGoogleOAuthError(e)
    redirectToLoginWithOAuthError(req, res, oauthError, next)
  }
})

router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const config = await getGoogleConfig()

    const stateCookie = req.signedCookies?.g_state
    const verifierCookie = req.signedCookies?.g_verifier
    const nonceCookie = req.signedCookies?.g_nonce
    const nextCookie = req.signedCookies?.g_next || '/'

    const opts = getCookieOptions(req)
    const clearOpts = clearCookieOpts(opts as any)
    res.clearCookie('g_state', clearOpts as any)
    res.clearCookie('g_verifier', clearOpts as any)
    res.clearCookie('g_nonce', clearOpts as any)
    res.clearCookie('g_next', clearOpts as any)

    if (!stateCookie || !verifierCookie || !nonceCookie) {
      redirectToLoginWithOAuthError(req, res, 'missing_state', nextCookie)
      return
    }

    const currentUrl = new URL(req.originalUrl, inferredOrigin(req) || apiUrl(req))
    const tokenSet = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: verifierCookie,
      expectedState: stateCookie,
      expectedNonce: nonceCookie,
      idTokenExpected: true,
    })

    const claims = tokenSet.claims()
    if (!claims) {
      redirectToLoginWithOAuthError(req, res, 'oauth_failed', nextCookie)
      return
    }
    const sub = typeof claims.sub === 'string' ? claims.sub : null
    const email = typeof claims.email === 'string' ? normalizeEmail(claims.email) : null
    const emailVerified = Boolean((claims as any).email_verified)
    const name = typeof claims.name === 'string' ? claims.name.trim() : email
    const picture = typeof (claims as any)?.picture === 'string' ? (claims as any).picture : null

    if (!sub || !email || !emailVerified) {
      redirectToLoginWithOAuthError(req, res, 'oauth_failed', nextCookie)
      return
    }

    let user = await db('user').where({ googleSub: sub }).whereNull('deletedAt').first()
    if (!user) {
      user = await findUserByEmailInsensitive(email)
      if (user) {
        await db('user').where({ id: user.id }).update({ googleSub: sub, updated_at: new Date() })
      } else {
        const userId = randomUUID()
        await db('user').insert({
          id: userId,
          email,
          name: name || email,
          googleSub: sub,
          emailVerifiedAt: new Date(),
          profileData: JSON.stringify({ photo_url: picture }),
          created_at: new Date(),
          updated_at: new Date(),
        })
        user = await db('user').where({ id: userId }).first()

        // Default role
        const role = await db('roles').where({ name: 'user' }).first()
        if (role) await db('user_roles').insert({ userId, roleId: role.id })
      }
    }

    await db('user').where({ id: user.id }).update({ lastLoginAt: new Date() })
    const session = await createSession(req, res, user.id)
    const roles = await getUserRoles(user.id)
    const { code } = await issueAuthExchangeCode(session.sessionId)

    const redirect = new URL('/auth/callback', appUrl(req))
    redirect.searchParams.set('code', code)
    redirect.searchParams.set('next', nextCookie)
    res.redirect(redirect.toString())
  } catch (e: any) {
    console.error('[auth/google/callback]', e)
    redirectToLoginWithOAuthError(req, res, 'oauth_failed')
  }
})

router.post('/register', async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(req.body?.email)
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    const name = normalizeName(req.body?.name)

    if (!email || !email.includes('@') || password.length < 8 || !name) {
      res.status(400).json({ success: false, error: 'Invalid payload' })
      return
    }

    const existing = await db('user').where({ email }).first()
    if (existing) {
      res.status(409).json({ success: false, error: 'Email already in use' })
      return
    }

    const userId = randomUUID()
    const passwordHash = await hashPassword(password)
    await db('user').insert({
      id: userId,
      email,
      name,
      passwordHash,
      profileData: JSON.stringify({}),
      created_at: new Date(),
      updated_at: new Date(),
    })

    const role = await db('roles').where({ name: 'user' }).first()
    if (role) await db('user_roles').insert({ userId, roleId: role.id })

    const session = await createSession(req, res, userId)
    void issueEmailVerification(userId, email, name).catch(() => null)

    res.status(200).json({
      success: true,
      user: { id: userId, email, name, roles: ['user'], emailVerifiedAt: null },
      auth: {
        accessToken: session.accessToken,
        tokenType: 'Bearer',
        expiresAt: session.expiresAt.toISOString(),
      },
    })
  } catch (e: any) {
    logError('auth_register_error', { error: serializeError(e) })
    res.status(500).json({ success: false, error: 'Registration failed' })
  }
})

router.post('/login', async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(req.body?.email)
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Invalid payload' })
      return
    }

    const user = await db('user').where({ email }).whereNull('deletedAt').first()
    if (!user || !user.passwordHash) {
      res.status(401).json({ success: false, error: 'Invalid credentials' })
      return
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      res.status(401).json({ success: false, error: 'Invalid credentials' })
      return
    }

    await db('user').where({ id: user.id }).update({ lastLoginAt: new Date() })
    const session = await createSession(req, res, user.id)
    const roles = await getUserRoles(user.id)

    res.status(200).json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, roles, emailVerifiedAt: user.emailVerifiedAt },
      auth: {
        accessToken: session.accessToken,
        tokenType: 'Bearer',
        expiresAt: session.expiresAt.toISOString(),
      },
    })
  } catch (e: any) {
    logError('auth_login_error', { error: serializeError(e) })
    res.status(500).json({ success: false, error: 'Login failed' })
  }
})

router.post('/wallet-login', async (req: Request, res: Response) => {
  try {
    const { walletAddress, signature, message } = req.body;

    if (!walletAddress || !signature || !message) {
      return res.status(400).json({ success: false, error: 'Wallet address, signature, and message are required.' });
    }

    // Verify signature (SIWS - Sign-In With Solana)
    try {
      const signatureBytes = bs58.decode(signature);
      const messageBytes = new TextEncoder().encode(message);
      const publicKeyBytes = bs58.decode(walletAddress);

      if (publicKeyBytes.length !== 32) {
        return res.status(400).json({ success: false, error: 'Invalid public key format.' });
      }

      if (!nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes)) {
        return res.status(401).json({ success: false, error: 'Invalid signature.' });
      }

      // Replay Protection: Verify timestamp
      const timestampMatch = message.match(/Timestamp: (\d+)/);
      if (!timestampMatch) return res.status(400).json({ success: false, error: 'Missing timestamp in message.' });
      const timestamp = parseInt(timestampMatch[1]);
      const now = Date.now();
      const FIVE_MINUTES = 5 * 60 * 1000;
      if (Math.abs(now - timestamp) > FIVE_MINUTES) {
        return res.status(401).json({ success: false, error: 'Signature expired (replay protection).' });
      }
    } catch (e) {
        logError('siws_signature_verification_error', { error: serializeError(e), walletAddress });
        return res.status(401).json({ success: false, error: 'Signature verification failed.' });
    }
    
    // Advanced System: If user is currently logged in via email, link the wallet to their account
    try {
      const sessionUser = await getSessionUser(req);
      if (sessionUser) {
        // Ensure another user doesn't already have this wallet
        const existingWalletUser = await db('user').where({ walletAddress }).whereNot({ id: sessionUser.id }).first();
        if (existingWalletUser) {
          return res.status(409).json({ success: false, error: 'Wallet already linked to another account.' });
        }
        await db('user').where({ id: sessionUser.id }).update({ walletAddress, updated_at: new Date() });
        const updatedUser = await getSessionUser(req, sessionUser.id); // Re-fetch user to get merged data
        res.status(200).json({ success: true, user: updatedUser });
        return;
      }
    } catch (sessionErr) {
      // Ignore session errors and proceed to auto-assign/login
    }

    // Auto-assign: If logging in directly, create or fetch wallet-based account
    let user;
    try {
      user = await db('user').where({ walletAddress }).first();
      if (!user) {
        const userId = randomUUID(); // Standard UUID string
        await db('user').insert({
          id: userId,
          email: null, // Initial email is null, will prompt for verification
          name: 'Phantom User',
          walletAddress,
          profileData: JSON.stringify({ displayName: 'Phantom Creator' }),
          created_at: new Date(),
          updated_at: new Date(),
        });
        user = await db('user').where({ id: userId }).first();
        // Assign default 'user' role
        const role = await db('roles').where({ name: 'user' }).first();
        if (role) await db('user_roles').insert({ userId, roleId: role.id });
      }
    } catch (dbErr) {
      console.error('Elite DB Provisioning Error:', dbErr);
      return res.status(500).json({ success: false, error: 'Database provisioning failed' });
    }

    await db('user').where({ id: user.id }).update({ lastLoginAt: new Date() });
    const session = await createSession(req, res, user.id);
    const roles = await getUserRoles(user.id);

    res.status(200).json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, walletAddress, roles, emailVerifiedAt: user.emailVerifiedAt },
      auth: {
        accessToken: session.accessToken,
        tokenType: 'Bearer',
        expiresAt: session.expiresAt.toISOString(),
      },
    });
  } catch (e: any) {
    logError('auth_wallet_login_error', { error: serializeError(e) });
    res.status(500).json({ success: false, error: 'Wallet authentication failed' });
  }
});

router.post('/logout', async (req: Request, res: Response) => {
  await destroySession(req, res)
  res.status(200).json({ success: true })
})

router.get('/me', async (req: Request, res: Response) => {
  const sessionUser = await getSessionUser(req)
  if (!sessionUser) {
    res.status(401).json({ success: false, error: 'Unauthorized' })
    return
  }
  res.status(200).json({ success: true, user: sessionUser })
})

router.post('/exchange', async (req: Request, res: Response) => {
  try {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : ''
    if (!code) {
      res.status(400).json({ success: false, error: 'Code required' })
      return
    }

    const codeHash = sha256Hex(code)
    const record = await db('authexchangecode').where({ codeHash }).first()
    if (!record || new Date(record.expiresAt).getTime() < Date.now() || record.usedAt) {
      res.status(400).json({ success: false, error: 'Invalid or expired code' })
      return
    }

    await db('authexchangecode').where({ id: record.id }).update({ usedAt: new Date() })

    const session = await db('session').where({ id: record.sessionId }).first()
    if (!session || session.revokedAt || new Date(session.expiresAt).getTime() < Date.now()) {
      res.status(401).json({ success: false, error: 'Session invalid' })
      return
    }

    const user = await db('user').where({ id: session.userId }).whereNull('deletedAt').first()
    const roles = await getUserRoles(user.id)
    const accessToken = await signSessionToken({
      v: 1, sid: session.id, uid: user.id
    }, new Date(session.expiresAt))

    res.status(200).json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, roles, emailVerifiedAt: user.emailVerifiedAt },
      auth: { accessToken, tokenType: 'Bearer', expiresAt: session.expiresAt }
    })
  } catch (e: any) {
    res.status(500).json({ success: false, error: 'Exchange failed' })
  }
})

/**
* Professional X (Twitter) OAuth2 Callback
* Handles code exchange for verified handles.
*/
router.post('/twitter/callback', async (req: Request, res: Response) => {
  res.status(501).json({ error: 'Twitter linking is currently undergoing maintenance.' });
});

/**
* Professional Discord OAuth2 Callback
*/
router.post('/discord/callback', async (req: Request, res: Response) => {
  res.status(501).json({ error: 'Discord linking is currently undergoing maintenance.' });
});

/**
 * Elite Admin Email Login
 * Validates admin credentials and issues a JWT session.
 */
router.post('/admin/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL ;
  if (email !== ADMIN_EMAIL) {
      return res.status(403).json({ success: false, error: 'Unauthorized administrative access.' });
  }

  try {
    const user = await db('user').where({ email }).first();
    if (!user || !user.passwordHash) {
      return res.status(401).json({ success: false, error: 'Invalid admin credentials.' });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid admin credentials.' });
    }

    const session = await createSession(req, res, user.id);
    const roles = await getUserRoles(user.id);

    res.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, roles },
      auth: {
        accessToken: session.accessToken,
        tokenType: 'Bearer',
        expiresAt: session.expiresAt.toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error during admin login.' });
  }
});

/**
 * Professional Phantom Google Callback
 * Ensures the wallet (created or retrieved) is bonded to a TipLnk account.
 */
router.post('/phantom-google/callback', async (req: Request, res: Response) => {
  const { walletAddress, signature, message } = req.body;

  if (!walletAddress || !signature || !message) {
    return res.status(400).json({ success: false, error: 'Wallet address, signature, and message are required for this action.' });
  }

  // Elite Security: Verify wallet ownership using SIWS
  try {
    const signatureBytes = bs58.decode(signature);
    const messageBytes = new TextEncoder().encode(message);
    const publicKeyBytes = bs58.decode(walletAddress);

    if (publicKeyBytes.length !== 32) {
      return res.status(400).json({ success: false, error: 'Invalid wallet public key format.' });
    }

    if (!nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes)) {
      return res.status(401).json({ success: false, error: 'Invalid wallet signature.' });
    }

    // Replay Protection: Verify timestamp
    const timestampMatch = message.match(/Timestamp: (\d+)/);
    if (!timestampMatch) return res.status(400).json({ success: false, error: 'Missing timestamp in message.' });
    const timestamp = parseInt(timestampMatch[1]);
    const now = Date.now();
    const FIVE_MINUTES = 5 * 60 * 1000;
    if (Math.abs(now - timestamp) > FIVE_MINUTES) {
      return res.status(401).json({ success: false, error: 'Signature expired (replay protection).' });
    }
  } catch (e) {
    logError('phantom_google_siws_error', { error: serializeError(e), walletAddress });
    return res.status(401).json({ success: false, error: 'Signature verification failed.' });
  }

  try {
    let user = await db('user').where({ walletAddress }).first();

    // Auto-provision TipLnk Account for the verified wallet
    if (!user) {
      const userId = randomUUID();
      await db('user').insert({
        id: userId,
        email: null, // Initial email is null
        name: 'Phantom Creator',
        walletAddress,
        profileData: JSON.stringify({ displayName: 'New Creator', provider: 'phantom-google' }),
        created_at: new Date(),
        updated_at: new Date(),
      });
      user = await db('user').where({ id: userId }).first();
      // Assign default 'user' role
      const role = await db('roles').where({ name: 'user' }).first();
      if (role) await db('user_roles').insert({ userId, roleId: role.id });
    }

    await db('user').where({ id: user.id }).update({ lastLoginAt: new Date() });
    const session = await createSession(req, res, user.id);
    const roles = await getUserRoles(user.id);

    res.json({
      success: true,
      walletAddress,
      user: { id: user.id, email: user.email, name: user.name, roles },
      auth: {
        accessToken: session.accessToken,
        tokenType: 'Bearer',
        expiresAt: session.expiresAt.toISOString(),
      },
    });
  } catch (err) {
    console.error('Phantom-Google Provisioning Fault:', err);
    res.status(500).json({ success: false, error: 'Failed to sync wallet with account system.' });
  }
});

/**
 * Elite Email Linking: Phase 1 (Send Code)
 * Generates a 6-digit code and dispatches via Brevo.
 */
router.post('/link-email/start', async (req: Request, res: Response) => {
  const { email } = req.body;
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Session required' });

  try {
    const code = randomCode(6);
    const codeHash = sha256Hex(code);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // Store verification intent
    await db('email_verification_token').insert({
        id: randomUUID(),
        userId: user.id,
        email,
        tokenHash: codeHash,
        expiresAt,
        created_at: new Date()
    });

    await sendMail({
      to: email,
      subject: `Verification Code: ${code} - TipLnk`,
      text: `Your TipLnk verification code is: ${code}`,
      html: `
        <div style="font-family: sans-serif; background: #0d1117; color: white; padding: 40px; border-radius: 20px;">
          <h2 style="color: #00d265;">Verify your Email</h2>
          <p style="font-size: 16px;">Enter the code below to link this email to your TipLnk profile:</p>
          <div style="background: #161b22; padding: 20px; text-align: center; border-radius: 12px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: 900; letter-spacing: 10px; color: #00d265;">${code}</span>
          </div>
          <p style="color: #8b949e; font-size: 12px;">This code expires in 15 minutes.</p>
        </div>
      `
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Email Link Start Fault:', err);
    res.status(500).json({ error: 'Failed to send verification email.' });
  }
});

/**
 * Elite Email Linking: Phase 2 (Verify & Bond)
 */
router.post('/link-email/verify', async (req: Request, res: Response) => {
  const { code, email } = req.body;
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Session required' });

  try {
    const codeHash = sha256Hex(code);
    const record = await db('email_verification_token')
      .where({ userId: user.id, email, tokenHash: codeHash })
      .andWhere('expiresAt', '>', new Date())
      .first();

    if (!record) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }

    // Success: Update User Profile in Supabase
    await db('user').where({ id: user.id }).update({
      email,
      emailVerifiedAt: new Date(),
      updated_at: new Date()
    });

    // Cleanup
    await db('email_verification_token').where({ userId: user.id }).delete();

    res.json({ success: true, message: 'Email successfully verified and linked.' });
  } catch (err) {
    res.status(500).json({ error: 'Verification failed.' });
  }
});

export default router;

    res.status(500).json({ error: 'Verification failed.' });
  }
});

export default router;
