import type { VercelRequest, VercelResponse } from "@vercel/node"
import { createRemoteJWKSet, jwtVerify } from "jose"
import { db } from "../../_lib/db.js"
import { createSession } from "../../_lib/session.js"
import { emitTorqueEvent } from "../../_lib/torque.js"
import { logError, serializeError } from "../../_lib/logger.js"
import { randomUUID } from "crypto"

/**
 * PHASE 1: Dynamic Auth Integration
 * Verifies Dynamic JWT, resolves user identity, and issues TipLnk session.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { dynamicJwt } = req.body
  const envId = process.env.VITE_DYNAMIC_ENVIRONMENT_ID

  if (!dynamicJwt) {
    return res.status(400).json({ error: 'Missing Dynamic JWT' })
  }

  if (!envId) {
    return res.status(500).json({ error: 'Server misconfiguration: VITE_DYNAMIC_ENVIRONMENT_ID missing' })
  }

  try {
    const jwksUrl = `https://app.dynamic.xyz/api/v0/environments/${envId}/keys`
    const JWKS = createRemoteJWKSet(new URL(jwksUrl))

    const { payload } = await jwtVerify(dynamicJwt, JWKS, {
      issuer: `https://app.dynamic.xyz/${envId}`,
    })

    const dynamicUserId = payload.sub
    if (!dynamicUserId) {
       return res.status(400).json({ error: 'Invalid JWT payload' })
    }

    const email = payload.email as string | undefined
    const verifiedCredentials = payload.verified_credentials as Array<any> || []
    
    const primaryWallet = verifiedCredentials.find(c => c.format === 'blockchain' && c.chain === 'sol')

    if (!primaryWallet && !email) {
       return res.status(400).json({ error: 'No wallet or email associated with this Dynamic identity' })
    }

    let user = null;

    if (primaryWallet) {
        user = await db('user').where({ walletAddress: primaryWallet.address }).first()
    } 

    if (!user && email) {
        user = await db('user').where({ email }).first()
    }

    if (!user) {
        const users = await db('user').select('*')
        user = users.find(u => {
            try {
               const p = JSON.parse(u.profileData || '{}')
               return p.dynamic_user_id === dynamicUserId
            } catch { return false }
        })
    }

    let isNewUser = false;
    if (user) {
        const profile = JSON.parse(user.profileData || '{}')
        if (profile.dynamic_user_id !== dynamicUserId) {
            profile.dynamic_user_id = dynamicUserId
            await db('user').where({ id: user.id }).update({ profileData: JSON.stringify(profile) })
        }
    } else {
        isNewUser = true;
        const newUserId = `auth_${randomUUID()}`
        user = {
            id: newUserId,
            email: email || null,
            walletAddress: primaryWallet ? primaryWallet.address : null,
            name: email ? email.split('@')[0] : 'Dynamic User',
            onboardingComplete: false,
            emailVerifiedAt: email ? new Date() : null,
            profileData: JSON.stringify({ dynamic_user_id: dynamicUserId })
        }
        
        await db('user').insert(user)
    }

    if (isNewUser) {
        await emitTorqueEvent({
            event_type: 'user_signup',
            metadata: {
                user_id: user.id,
                dynamic_user_id: dynamicUserId,
                wallet_address: user.walletAddress,
                source: 'backend'
            }
        });
    }

    await emitTorqueEvent({
        event_type: 'user_login',
        metadata: {
            user_id: user.id,
            dynamic_user_id: dynamicUserId,
            wallet_address: user.walletAddress,
            source: 'backend'
        }
    });

    const session = await createSession(req as any, res as any, user.id)

    return res.json({
      success: true,
      user,
      sessionToken: session.accessToken,
      auth: {
        accessToken: session.accessToken,
        type: 'Bearer',
        expiresAt: session.expiresAt.toISOString(),
      },
    })
  } catch (e: any) {
    logError('auth_dynamic_verify_error', { error: serializeError(e) })
    console.error('Dynamic Verify Error:', e)
    res.status(401).json({ success: false, error: 'Invalid or expired authentication token' })
  }
}
