import type { VercelRequest, VercelResponse } from "@vercel/node"
import axios from "axios"
import { applyCors } from "../_cors.js"
import { db } from "../../backend/lib/db.js"

/**
 * Task 2.2: Standalone Vercel Function for Diagnostics
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!applyCors(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const adminSecret = req.headers['x-admin-secret']
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ error: 'Unauthorized diagnostic access' })
  }

  const results: any = { status: 'ok', checks: {} }
  const TEST_WALLET = process.env.VITE_TREASURY_WALLET

  try {
    const HELIUS_API_KEY = process.env.HELIUS_API_KEY
    const dflow = await axios.get(`https://quote-api.dflow.net/order`, {        
      params: {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: '100000000',
        slippageBps: '50',
        userPublicKey: TEST_WALLET      
      }
    })
    results.checks.dflow = dflow.data.outAmount ? 'PASS' : 'FAIL'
  } catch (e) { results.checks.dflow = 'FAIL' }

  try {
    const HELIUS_API_KEY = process.env.HELIUS_API_KEY
    const helius = await axios.post(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
      jsonrpc: '2.0', id: 1, method: 'getHealth'
    })
    results.checks.helius = helius.data.result === 'ok' ? 'PASS' : 'FAIL'      
  } catch (e) { results.checks.helius = 'FAIL' }
  
  try {
    const dbCheck = await db('user').first()
    results.checks.database = dbCheck ? 'PASS' : 'FAIL'
  } catch (e) { results.checks.database = 'FAIL' }

  res.json(results)
}
