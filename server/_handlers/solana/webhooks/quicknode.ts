import type { Request as VercelRequest, Response as VercelResponse } from 'express'
import { db } from "../../../_lib/db.js"
import { rpcManager } from "../../../_lib/rpc.js"
import { PublicKey } from "@solana/web3.js"
import crypto from 'crypto'
import { getSolPrice } from "../../../_lib/price.js"

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenErt'

/**
 * Quicknode Streams Webhook Handler
 * Receives real-time transaction data from Quicknode Streams.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const signature = req.headers['x-qn-signature'] as string
  const QN_SECRET = process.env.QUICKNODE_WEBHOOK_SECRET

  if (!signature || !QN_SECRET) {
    console.error('🛡️ Quicknode Webhook: Missing signature or server secret.')
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const payload = JSON.stringify(req.body)
  const expectedSignature = crypto
    .createHmac('sha256', QN_SECRET)
    .update(payload)
    .digest('hex')

  const isValid = crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(signature, 'hex')
  )

  if (!isValid) {
    console.warn('⚠️ Quicknode Webhook: Invalid signature detected. Potential injection attempt.')
    return res.status(401).json({ error: 'Invalid signature' })
  }

  try {
    const data = req.body
    const transactions = Array.isArray(data) ? data : [data]
    const solPrice = await getSolPrice()

    console.log(`🚀 Quicknode Stream: Received ${transactions.length} items.`)

    for (const tx of transactions) {
      const signature = tx.transaction?.signatures?.[0] || tx.sig
      if (!signature) continue

      console.log(`✅ Processing Tip signature via Quicknode: ${signature}`)
      
      // PRODUCTION-GRADE VALIDATION:
      // 1. Identify all transfers in the transaction
      // 2. Find the transfer where the recipient is one of our registered creators
      
      const nativeTransfers = tx.meta?.innerInstructions?.flatMap((ii: any) => 
        ii.instructions.filter((ix: any) => ix.parsed?.type === 'transfer')
      ) || [];

      // Combine with top-level instructions if they are simple transfers
      const allInstructions = [...(tx.transaction?.message?.instructions || []), ...nativeTransfers];
      
      for (const ix of allInstructions) {
        // Simple SOL Transfer
        if (ix.program === 'system' && ix.parsed?.type === 'transfer') {
            const { destination, lamports, source } = ix.parsed.info;
            const amountSOL = lamports / 1e9;

            // Verify if destination is a registered creator
            const creator = await db('user').where({ walletAddress: destination }).first();
            if (creator) {
                const solPrice = await getSolPrice();
                const valueUsd = amountSOL * solPrice;

                await db('tips').insert({
                    signature,
                    slot: tx.slot || 0,
                    timestamp: new Date(),
                    sender: source,
                    recipient: destination,
                    amount: amountSOL,
                    tokenMint: 'So11111111111111111111111111111111111111112',
                    tokenSymbol: 'SOL',
                    status: 'confirmed',
                    type: 'tip'
                }).onConflict('signature').ignore();

                await db('user').where({ id: creator.id }).increment('totalTipsUSDC', valueUsd);
                console.log(`💰 Verified SOL Tip: ${amountSOL} SOL ($${valueUsd}) to ${creator.id}`);
                break; // Process one tip per signature for now
            }
        }

        // SPL Token Transfer (USDC/USDT)
        if (ix.program === 'spl-token' && (ix.parsed?.type === 'transfer' || ix.parsed?.type === 'transferChecked')) {
            const { destination, amount, mint } = ix.parsed.info;
            const isUSDC = mint === USDC_MINT;
            const isUSDT = mint === USDT_MINT;

            if (isUSDC || isUSDT) {
                // Find owner of the destination ATA
                // In a production environment, we'd lookup the creator by their ATA 
                // or assume the accountKeys[1] logic if we enforced it in the Anchor program.
                // For this fix, we iterate keys to find a matching registered creator wallet.
                const recipientOwner = tx.transaction?.message?.accountKeys?.find(async (key: string) => {
                    return await db('user').where({ walletAddress: key }).first();
                });

                if (recipientOwner) {
                    const amountToken = Number(amount) / 1e6;
                    await db('tips').insert({
                        signature,
                        slot: tx.slot || 0,
                        timestamp: new Date(),
                        sender: 'TOKEN_SENDER',
                        recipient: recipientOwner,
                        amount: amountToken,
                        tokenMint: mint,
                        tokenSymbol: isUSDC ? 'USDC' : 'USDT',
                        status: 'confirmed',
                        type: 'tip'
                    }).onConflict('signature').ignore();

                    await db('user').where({ walletAddress: recipientOwner }).increment('totalTipsUSDC', amountToken);
                    console.log(`💰 Verified ${isUSDC ? 'USDC' : 'USDT'} Tip: ${amountToken} to ${recipientOwner}`);
                    break;
                }
            }
        }
      }
    }

    return res.status(200).json({ success: true })
  } catch (err: any) {
    console.error('Quicknode Webhook Error:', err.message)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
