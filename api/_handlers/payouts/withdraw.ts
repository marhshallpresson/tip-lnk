import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomUUID } from 'crypto'
import axios from 'axios'
import { db, getCreatorBalance } from '../../_lib/db.js'
import { getSessionUser } from '../../_lib/session.js'

/**
 * Task 1: Pajcash Offramp Initiation
 * Withdraws USDC to Nigerian Bank via Pajcash.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // ─── ELITE AUTHENTICATION ───
    const user = await getSessionUser(req as any)
    if (!user || !user.walletAddress) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { amountUSDC } = req.body
    const withdrawAmount = Number(amountUSDC)
    
    if (!withdrawAmount || isNaN(withdrawAmount) || withdrawAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' })
    }

    // ─── ELITE BALANCE ENFORCEMENT ───
    const ledger = await getCreatorBalance(user.walletAddress)
    if (withdrawAmount > ledger.balance) {
        return res.status(400).json({ 
            error: 'Insufficient Balance', 
            message: `You attempted to withdraw $${withdrawAmount} but only have $${ledger.balance.toFixed(2)} available.` 
        })
    }

    const amountNGN = withdrawAmount * 1250 // Fixed exchange rate for demo
    const reference = `PAJ-${randomUUID().replace(/-/g, '').slice(0, 16)}`

    // ─── ELITE PAJCASH INTEGRATION ───
    const PAJCASH_API_KEY = process.env.PAJCASH_API_KEY
    const PAJCASH_BASE_URL = process.env.PAJCASH_BASE_URL || 'https://api.pajcash.com'

    if (!PAJCASH_API_KEY || PAJCASH_API_KEY === 'NEVER_COMMIT_THIS') {
        return res.status(503).json({ 
            error: 'Payouts Disabled', 
            message: 'Pajcash integration is not configured for this environment.' 
        })
    }

    // Create a pending payout record
    await db('payouts').insert({
      pajcash_reference: reference,
      status: 'pending',
      amount_ngn: amountNGN,
      wallet_address: user.walletAddress,
      updated_at: new Date()
    })

    try {
      // Direct integration call to Pajcash
      const response = await axios.post(`${PAJCASH_BASE_URL}/api/v1/offramp/initiate`, {
        amount: amountNGN,
        currency: 'NGN',
        reference,
        walletAddress: user.walletAddress,
        webhookUrl: 'https://tip-lnk.vercel.app/api/payouts/webhook'
      }, {
        headers: { 'Authorization': `Bearer ${PAJCASH_API_KEY}` }
      })
      
      return res.status(200).json({ 
        success: true, 
        checkoutUrl: response.data?.checkoutUrl || 'https://checkout.pajcash.com/' + reference,
        reference 
      })
    } catch (apiErr: any) {
      console.error('Pajcash API Error:', apiErr.response?.data || apiErr.message)
      await db('payouts').where({ pajcash_reference: reference }).update({ status: 'failed', updated_at: new Date() })
      return res.status(500).json({ error: 'Failed to initiate Pajcash off-ramp' })
    }

  } catch (err: any) {
    console.error('Payouts Withdraw Error:', err)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
