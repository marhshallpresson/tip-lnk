import type { VercelRequest, VercelResponse } from "@vercel/node"
import { db } from "../../_lib/db.js"
import { encrypt, hashAddress } from "../../_lib/crypto.js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  console.log('🚀 Starting Privacy & Domain Migration...')
  const results = {
    migratedDomains: 0,
    scrubbedProfiles: 0,
    encryptedWallets: 0,
    linkedTips: 0,
    linkedPayouts: 0,
    errors: [] as string[]
  }
  
  try {
    // 1. Flush any references to tiplink.so in profileData
    const usersWithProfile = await db('user').where('profileData', 'like', '%tiplink.so%')
    for (const user of usersWithProfile) {
      try {
        const newProfileData = user.profileData.replace(/tiplink\.so/g, 'tipstack.fun')
        await db('user').where({ id: user.id }).update({ profileData: newProfileData })
        results.scrubbedProfiles++
      } catch (e: any) {
        results.errors.push(`Profile scrubbing error for ${user.id}: ${e.message}`)
      }
    }

    // 2. Encrypt Wallet Addresses & Generate Hashes
    const usersToEncrypt = await db('user').whereNotNull('walletAddress').whereNull('encryptedWalletAddress')
    for (const user of usersToEncrypt) {
      try {
        const encrypted = encrypt(user.walletAddress)
        const hash = hashAddress(user.walletAddress)
        await db('user').where({ id: user.id }).update({
          encryptedWalletAddress: encrypted,
          walletAddressHash: hash
        })
        results.encryptedWallets++
      } catch (e: any) {
        results.errors.push(`Wallet encryption error for ${user.id}: ${e.message}`)
      }
    }

    // 3. Link Tips to User IDs
    const tipsToLink = await db('tips').whereNull('recipient_id')
    for (const tip of tipsToLink) {
      try {
        // Find recipient
        const recipient = await db('user')
          .where({ walletAddress: tip.recipient })
          .orWhere({ walletAddressHash: hashAddress(tip.recipient) })
          .first()
        
        // Find sender
        const sender = await db('user')
          .where({ walletAddress: tip.sender })
          .orWhere({ walletAddressHash: hashAddress(tip.sender) })
          .first()

        await db('tips').where({ signature: tip.signature }).update({
          recipient_id: recipient?.id || null,
          sender_id: sender?.id || null
        })
        results.linkedTips++
      } catch (e: any) {
        results.errors.push(`Tip linking error for ${tip.signature}: ${e.message}`)
      }
    }

    // 4. Link Payouts to User IDs
    const payoutsToLink = await db('payouts').whereNull('user_id')
    for (const payout of payoutsToLink) {
      try {
        const user = await db('user')
          .where({ walletAddress: payout.wallet_address })
          .orWhere({ walletAddressHash: hashAddress(payout.wallet_address) })
          .first()
        
        if (user) {
          await db('payouts').where({ id: payout.id }).update({ user_id: user.id })
          results.linkedPayouts++
        }
      } catch (e: any) {
        results.errors.push(`Payout linking error for ${payout.id}: ${e.message}`)
      }
    }

    return res.json({ success: true, results })
  } catch (err: any) {
    console.error('❌ Migration Failed:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
}
