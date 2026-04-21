import type { VercelRequest, VercelResponse } from "@vercel/node"
import { applyCors } from "../../_cors.js"
import { db } from "../../../backend/lib/db.js"
import { getSessionUser } from "../../../backend/lib/session.js"
import { verifySignature } from "../../../src/lib/crypto.js"

/**
 * Task 2.2: Standalone Vercel Function for Profile Updates
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!applyCors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authUser = await getSessionUser(req as any)
  if (!authUser) {
    return res.status(401).json({ success: false, error: 'Authentication required' })
  }

  const { walletAddress, profile, signature, message } = req.body

  // Elite Hardening: Ensure users can only update their OWN profile
  if (authUser.walletAddress && walletAddress !== authUser.walletAddress && walletAddress !== authUser.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Profile ownership mismatch' })
  }

  try {
    const solDomain = profile.solDomain || (profile.profile && profile.profile.solDomain)

    // Task 3.1: ELITE SECURITY GUARD: Handle Ownership Verification via src/lib/crypto.ts
    if (solDomain && signature && message && authUser.walletAddress) {
        try {
          const isValid = verifySignature(message, signature, authUser.walletAddress)

  
          if (!isValid || !message.includes(solDomain)) {
            return res.status(403).json({ success: false, error: 'Cryptographic identity theft detected. Invalid handle signature.' })
          }
          console.log(`🛡️ Verified identity for handle claim: ${solDomain}`)
        } catch (sigErr) {
          return res.status(400).json({ success: false, error: 'Malformed identity signature.' })
        }
    }

    // ─── Elite Profile Sync ───
    await db('user')
      .where({ id: authUser.id })
      .update({ 
        profileData: JSON.stringify(profile),
        solDomain: solDomain || null,
        twitterHandle: profile.twitterHandle || null,
        discordHandle: profile.discordHandle || null,
        name: profile.displayName || profile.name,
        updated_at: new Date()
      })
    res.json({ success: true })
  } catch (err) {
    console.error('Profile Update Error:', err)
    res.status(500).json({ success: false, error: 'Failed to update profile' })
  }
}
