import type { VercelRequest, VercelResponse } from "@vercel/node"
import { db } from "../../../_lib/db.js"
import { getSessionUser } from "../../../_lib/session.js"
import { verifySignature } from "../../../_lib/crypto.js"

/**
 * Task 2.2: Standalone Vercel Function for Profile Updates
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    const incomingName = profile.displayName || profile.name;
    const finalName = incomingName && incomingName.trim().length > 0 ? incomingName.trim() : authUser.name;
    
    // Extract social handles from either root or nested socials object
    const twitterHandle = profile.twitterHandle || (profile.socials && profile.socials.twitter);
    const discordHandle = profile.discordHandle || (profile.socials && profile.socials.discord);

    // Clean up profile object before saving to profileData JSON column
    const profileToSave = { ...profile };
    delete profileToSave.twitterHandle;
    delete profileToSave.discordHandle;
    delete profileToSave.solDomain;

    await db('user')
      .where({ id: authUser.id })
      .update({ 
        profileData: JSON.stringify(profileToSave),
        solDomain: solDomain || null,
        twitterHandle: twitterHandle || null,
        discordHandle: discordHandle || null,
        name: finalName,
        onboardingComplete: profile.onboardingComplete === true,
        updated_at: new Date()
      })
    res.json({ success: true })
  } catch (err) {
    console.error('Profile Update Error:', err)
    res.status(500).json({ success: false, error: 'Failed to update profile' })
  }
}
