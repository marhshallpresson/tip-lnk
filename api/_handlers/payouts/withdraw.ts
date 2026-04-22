import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomUUID } from 'crypto'
import axios from 'axios'
import { db } from '../../_lib/db.js'
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
    if (!amountUSDC || isNaN(Number(amountUSDC)) || Number(amountUSDC) <= 0) {
      return res.status(400).json({ error: 'Invalid amount' })
    }

    const amountNGN = Number(amountUSDC) * 1250 // Fixed exchange rate for demo
    const reference = `PAJ-${randomUUID().replace(/-/g, '').slice(0, 16)}`

    // ─── ELITE PAJCASH INTEGRATION ───
    const PAJCASH_API_KEY = process.env.PAJCASH_API_KEY
    const PAJCASH_BASE_URL = process.env.PAJCASH_BASE_URL || 'https://api.pajcash.com'

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
      if (PAJCASH_API_KEY && PAJCASH_API_KEY !== 'NEVER_COMMIT_THIS') {
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
      } else {
        // Fallback for hackathon demo mode: auto-confirm after a few seconds via a mock
        console.warn('🛡️ Pajcash: Using simulation mode. No real API key found.')
        
        // Simulate a webhook callback after 5 seconds to mark it 'completed'
        setTimeout(async () => {
          try {
            await db('payouts').where({ pajcash_reference: reference }).update({ status: 'completed', updated_at: new Date() })
          } catch (e) {}
        }, 5000);

        return res.status(200).json({ 
            success: true, 
            checkoutUrl: 'https://demo.pajcash.com/checkout/' + reference,
            reference,
            isSimulation: true 
        })
      }
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
