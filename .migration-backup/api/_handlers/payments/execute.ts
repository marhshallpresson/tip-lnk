import type { VercelRequest, VercelResponse } from "@vercel/node"
import axios from "axios"
import { VersionedTransaction } from "@solana/web3.js"
import { rateLimit } from "../../_ratelimit.js"
import { emitTorqueEvent } from "../../_lib/torque.js"

const stringValue = (value: unknown) => (typeof value === "string" ? value.trim() : "")

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" })
  if (!(await rateLimit(req, res))) return

  const provider = stringValue(req.body?.provider)
  const requestId = stringValue(req.body?.requestId)
  const signedTransaction = stringValue(req.body?.signedTransaction)

  if (provider !== "jupiter-ultra") {
    return res.status(400).json({ success: false, error: "Unsupported execution provider" })
  }

  if (!requestId || !signedTransaction) {
    return res.status(400).json({ success: false, error: "requestId and signedTransaction are required" })
  }

  try {
    VersionedTransaction.deserialize(Buffer.from(signedTransaction, "base64"))
  } catch {
    return res.status(400).json({ success: false, error: "Invalid signed transaction payload" })
  }

  try {
    const response = await axios.post(
      "https://api.jup.ag/ultra/v1/execute",
      { signedTransaction, requestId },
      {
        headers: {
          "Content-Type": "application/json",
          ...(process.env.JUPITER_API_KEY ? { "x-api-key": process.env.JUPITER_API_KEY } : {}),
        },
        timeout: 20000, // Increased timeout for heavy congestion
      }
    )

    const data = response.data || {}
    const signature = data.signature || data.txid || data.txId || data.transactionId || data.result?.signature
    if (!signature) {
      return res.status(502).json({ success: false, error: "Jupiter execution did not return a signature", details: data, retryable: true })
    }

    // â”€â”€â”€ ELITE GROWTH: TORQUE EVENT â”€â”€â”€
    // Track successful crypto tips for creator rewards and marketing analytics.
    const outAmount = data.outputAmount || data.outAmount || req.body?.expectedOutAmount || 0;
    
    emitTorqueEvent({
      event_type: 'tip_completed',
      metadata: {
        tx_signature: signature,
        amount_usd: Number(outAmount),
        token_symbol: req.body?.inputTokenSymbol || 'CRYPTO',
        source: 'backend',
        provider: 'jupiter-ultra'
      }
    }).catch(err => console.error('[Torque] Crypto event failed:', err.message));

    return res.status(200).json({
      success: true,
      provider,
      signature,
      status: data.status || data.swapStatus || "submitted",
      result: data,
    })
  } catch (error: any) {
    const status = error.response?.status
    const isRetryable = status === 429 || status >= 500
    
    console.error("Jupiter execution error:", error.response?.data || error.message)
    return res.status(status || 502).json({ 
      success: false, 
      error: "Jupiter execution failed", 
      message: error.response?.data?.message || error.message,
      retryable: isRetryable 
    })
  }
}
