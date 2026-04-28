import type { VercelRequest, VercelResponse } from "@vercel/node"
import { 
  ACTIONS_CORS_HEADERS, 
  createPostResponse, 
  type ActionGetResponse, 
  type ActionPostResponse,
  type ActionPostRequest
} from "@solana/actions"
import { 
  PublicKey, 
  SystemProgram, 
  Transaction, 
  LAMPORTS_PER_SOL 
} from "@solana/web3.js"
import { rpcManager } from "../../../_lib/rpc.js"
import { db } from "../../../_lib/db.js"

/**
 * PHASE 1: Solana Blinks (Actions)
 * Implements the tipping action for a specific wallet or creator handle.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Always include standard Solana Actions CORS headers
  Object.entries(ACTIONS_CORS_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value)
  })

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Extract wallet from path
  const path = req.url?.split('?')[0] || ''
  const parts = path.split('/').filter(Boolean)
  const walletStr = parts[parts.length - 1]

  if (!walletStr || walletStr === 'tip') {
    return res.status(400).json({ error: 'Wallet address or creator handle required' })
  }

  try {
    // 1. Resolve creator info
    let creatorAddress = walletStr
    let creatorName = 'Creator'

    // Try to find in DB
    const user = await db('user')
      .where({ walletAddress: walletStr })
      .orWhere({ solDomain: walletStr })
      .orWhere({ id: walletStr.replace('auth_', '') })
      .first()

    if (user) {
      creatorAddress = user.walletAddress
      creatorName = user.solDomain || user.name || 'Creator'
    }

    // Validate creator address
    try {
      new PublicKey(creatorAddress)
    } catch {
      return res.status(400).json({ error: 'Invalid creator address' })
    }

    // --- GET: Metadata ---
    if (req.method === 'GET') {
      const payload: ActionGetResponse = {
        icon: `https://tiplnk.me/api/og/${creatorAddress}`, // Use OG engine for icon
        title: `Tip ${creatorName} on TipLnk`,
        description: `Support ${creatorName} with a direct SOL tip. 0% platform fees.`,
        label: "Tip Now",
        links: {
          actions: [
            {
              type: "transaction",
              label: "Tip 0.1 SOL",
              href: `${req.url}?amount=0.1`,
            },
            {
              type: "transaction",
              label: "Tip 0.5 SOL",
              href: `${req.url}?amount=0.5`,
            },
            {
              type: "transaction",
              label: "Tip 1 SOL",
              href: `${req.url}?amount=1`,
            },
            {
              type: "transaction",
              label: "Custom Amount",
              href: `${req.url}?amount={amount}`,
              parameters: [
                {
                  name: "amount",
                  label: "Enter SOL amount",
                }
              ]
            }
          ]
        }
      }
      return res.json(payload)
    }

    // --- POST: Construct Transaction ---
    if (req.method === 'POST') {
      const { account } = req.body as ActionPostRequest
      const amountStr = req.query.amount as string

      if (!account) {
        return res.status(400).json({ error: 'Account (sender) required' })
      }

      if (!amountStr) {
        return res.status(400).json({ error: 'Amount required' })
      }

      const amount = parseFloat(amountStr)
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' })
      }

      const sender = new PublicKey(account)
      const recipient = new PublicKey(creatorAddress)

      // Build Transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: sender,
          toPubkey: recipient,
          lamports: Math.floor(amount * LAMPORTS_PER_SOL),
        })
      )

      // Get latest blockhash
      const { blockhash } = await rpcManager.executeWithFailover(async (conn) => {
        return await conn.getLatestBlockhash()
      })

      transaction.recentBlockhash = blockhash
      transaction.feePayer = sender

      const payload: ActionPostResponse = await createPostResponse({
        fields: {
          type: "transaction",
          transaction,
          message: `Thanks for supporting ${creatorName}!`,
        },
      })

      return res.json(payload)
    }

    return res.status(405).json({ error: 'Method not allowed' })

  } catch (err: any) {
    console.error('Action Error:', err)
    return res.status(500).json({ error: 'Internal server error', details: err.message })
  }
}
