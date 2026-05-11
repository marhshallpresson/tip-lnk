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
import { 
  getAssociatedTokenAddress, 
  createTransferCheckedInstruction, 
  getMint 
} from "@solana/spl-token"
import { rpcManager } from "../../../_lib/rpc.js"
import { db } from "../../../_lib/db.js"
import { decrypt } from "../../../_lib/crypto.js"

/**
 * PHASE 1: Solana Blinks (Actions)
 * Implements the tipping action for a specific wallet or creator handle.
 * Hardened for Zero-Knowledge: Decrypts payout address internally.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  Object.entries(ACTIONS_CORS_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value)
  })

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const path = req.url?.split('?')[0] || ''
  const parts = path.split('/').filter(Boolean)
  const walletStr = parts[parts.length - 1]

  if (!walletStr || walletStr === 'tip') {
    return res.status(400).json({ error: 'Wallet address or creator handle required' })
  }

  try {
    const user = await db('user')
      .where({ id: walletStr.replace('auth_', '') })
      .orWhere({ twitterHandle: walletStr.replace(/^@/, '') })
      .orWhere({ discordHandle: walletStr.replace(/^@/, '') })
      .orWhere({ solDomain: walletStr })
      .orWhere({ walletAddress: walletStr }) // Legacy support
      .first()

    if (!user) {
      return res.status(404).json({ error: 'Creator not found' })
    }

    // Decrypt the cloaked payout address
    let creatorAddress = user.walletAddress;
    if (!creatorAddress && user.encryptedWalletAddress) {
        try {
            creatorAddress = decrypt(user.encryptedWalletAddress);
        } catch (e) {
            return res.status(500).json({ error: 'Failed to decrypt creator payout address' })
        }
    }

    if (!creatorAddress) {
      return res.status(404).json({ error: 'Creator missing payout address' })
    }

    const creatorName = user.solDomain || user.name || user.twitterHandle || 'Creator'

    try {
      new PublicKey(creatorAddress)
    } catch {
      return res.status(400).json({ error: 'Invalid creator address' })
    }

    if (req.method === 'GET') {
      const payload: ActionGetResponse = {
        icon: `https://tipstack.fun/api/og/${user.id}`, // Use UUID for OG
        title: `Tip ${creatorName} on Tip Stack`,
        description: `Support ${creatorName} with a direct SOL or USDC tip. 0% platform fees.`,
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
              label: "Tip 5 USDC",
              href: `${req.url}?amount=5&spl-token=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`,
            },
            {
              type: "transaction",
              label: "Tip 10 USDC",
              href: `${req.url}?amount=10&spl-token=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`,
            },
            {
              type: "transaction",
              label: "Custom Amount",
              href: `${req.url}?amount={amount}`,
              parameters: [
                {
                  name: "amount",
                  label: "Enter amount",
                }
              ]
            }
          ]
        }
      }
      return res.json(payload)
    }

    const isProd = process.env.NODE_ENV === 'production';
    const creatorYieldEnabled = user.yield_enabled === true;

    if (req.method === 'POST') {
      const { account } = req.body as ActionPostRequest
      const amountStr = req.query.amount as string
      const splToken = req.query['spl-token'] as string

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
      const transaction = new Transaction()

      if (splToken) {
        const mint = new PublicKey(splToken)
        
        const { mintData, blockhash } = await rpcManager.executeWithFailover(async (conn) => {
           const [m, bh] = await Promise.all([
             getMint(conn, mint),
             conn.getLatestBlockhash()
           ])
           return { mintData: m, blockhash: bh.blockhash }
        })

        const fromAta = await getAssociatedTokenAddress(mint, sender)
        const toAta = await getAssociatedTokenAddress(mint, recipient)

        transaction.add(
          createTransferCheckedInstruction(
            fromAta,
            mint,
            toAta,
            sender,
            Math.floor(amount * Math.pow(10, mintData.decimals)),
            mintData.decimals
          )
        )

        // ─── ELITE DEFI: ATOMIC KAMINO YIELD ───
        // If creator has yield enabled, we attach the deposit instructions to the Blink payload.
        // This is "Connectless" because we don't know the sender's balance or identity 
        // until they interact with the Blink.
        if (creatorYieldEnabled && splToken === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') {
          try {
            const { getKaminoDepositInstructions } = await import("../../../_lib/kamino.js");
            const connection = await rpcManager.getConnection();
            const kaminoIxs = await getKaminoDepositInstructions(
              connection,
              recipient, // Deposit into creator's Kamino account
              Math.floor(amount * Math.pow(10, mintData.decimals)).toString(),
              "USDC"
            );
            transaction.add(...kaminoIxs);
            console.log('✅ Kamino instructions attached to Blink');
          } catch (e: any) {
            console.warn('⚠️ Failed to attach Kamino instructions to Blink:', e.message);
          }
        }

        transaction.recentBlockhash = blockhash
      } else {
        const { blockhash } = await rpcManager.executeWithFailover(async (conn) => {
          return await conn.getLatestBlockhash()
        })
        
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: sender,
            toPubkey: recipient,
            lamports: Math.floor(amount * LAMPORTS_PER_SOL),
          })
        )
        transaction.recentBlockhash = blockhash
      }

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
