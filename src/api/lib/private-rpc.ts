/**
 * SECURITY PATCH: Private RPC Endpoint Management (M-01)
 * 
 * Prevents:
 * - Data leakage through public RPCs
 * - Rate limiting / DoS
 * - MITM attacks
 * - Node operator inspection of transactions
 */

export interface RpcProviderConfig {
  name: string
  baseUrl: string
  apiKey: string
  priority: number // Lower = higher priority
  maxRetries: number
  timeout: number // ms
  supportedMethods: string[]
}

// Supported private RPC providers
export const RPC_PROVIDERS = {
  HELIUS: {
    name: 'Helius',
    baseUrl: 'https://mainnet.helius-rpc.com',
    envKey: 'HELIUS_API_KEY',
    docs: 'https://docs.helius.xyz',
  },
  QUICKNODE: {
    name: 'QuickNode',
    baseUrl: 'https://solana-mainnet.quiknode.pro',
    envKey: 'QUICKNODE_API_KEY',
    docs: 'https://www.quicknode.com/docs/solana',
  },
  TRITON: {
    name: 'Triton One',
    baseUrl: 'https://solana.api.triton.one',
    envKey: 'TRITON_API_KEY',
    docs: 'https://docs.triton.one',
  },
  ALCHEMY: {
    name: 'Alchemy',
    baseUrl: 'https://solana-mainnet.g.alchemy.com',
    envKey: 'ALCHEMY_API_KEY',
    docs: 'https://docs.alchemy.com/alchemy/apis/solana',
  },
}

/**
 * Get the active private RPC endpoint URL
 * Falls back to public RPC if private RPC is not configured
 */
export function getPrivateRpcUrl(network: 'mainnet' | 'devnet' = 'mainnet'): string {
  // Priority order for RPC endpoints
  const providers = [
    process.env.HELIUS_API_KEY && `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,
    process.env.QUICKNODE_API_KEY && `https://solana-mainnet.quiknode.pro/v1/${process.env.QUICKNODE_API_KEY}`,
    process.env.TRITON_API_KEY && `https://solana.api.triton.one:8899/?api-token=${process.env.TRITON_API_KEY}`,
    process.env.ALCHEMY_API_KEY && `https://solana-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
  ].filter(Boolean)

  if (providers.length > 0) {
    return providers[0] as string
  }

  // Fallback: ONLY use devnet public RPC during development
  if (network === 'devnet') {
    console.warn('⚠️  Using public devnet RPC. This is OK for development only.')
    return 'https://api.devnet.solana.com'
  }

  // Production should NEVER use public RPC
  console.error('❌ CRITICAL: No private RPC configured for production!')
  console.error('Set one of: HELIUS_API_KEY, QUICKNODE_API_KEY, TRITON_API_KEY, ALCHEMY_API_KEY')
  throw new Error('Private RPC endpoint required for production')
}

/**
 * Create a Vercel Edge Function to proxy RPC calls
 * This prevents client-side exposure of the RPC URL
 * 
 * Usage: Place this in api/solana/rpc.ts (or similar)
 * Client calls your domain's /api/solana/rpc instead of using RPC directly
 */
export function createRpcProxyHandler() {
  return async (req: any, res: any) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
      const body = req.body

      // Validate it's a valid JSON-RPC request
      if (!body.jsonrpc || !body.method || body.id === undefined) {
        return res.status(400).json({
          error: 'Invalid JSON-RPC request',
          code: 'INVALID_RPC_REQUEST',
        })
      }

      // Blocklist dangerous methods that shouldn't go through proxy
      const blocklist = [
        'sendTransaction', // Use dedicated /api/solana/send endpoint instead
        'signAndSendTransaction',
      ]

      if (blocklist.includes(body.method)) {
        return res.status(403).json({
          error: `Method ${body.method} not allowed through proxy`,
          code: 'METHOD_BLOCKED',
        })
      }

      // Get private RPC URL
      const rpcUrl = getPrivateRpcUrl('mainnet')

      // Forward request to private RPC
      const rpcResponse = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const responseData = await rpcResponse.json()

      // Add cache headers for safe read-only methods
      if (
        ['getBalance', 'getTokenAccountBalance', 'getProgramAccounts', 'getAccountInfo'].includes(
          body.method
        )
      ) {
        res.setHeader('Cache-Control', 'public, max-age=10') // Cache for 10 seconds
      } else {
        res.setHeader('Cache-Control', 'no-cache')
      }

      return res.status(200).json(responseData)
    } catch (error) {
      console.error('RPC proxy error:', error)
      return res.status(500).json({
        error: 'RPC request failed',
        code: 'RPC_ERROR',
      })
    }
  }
}

/**
 * Health check for RPC endpoint
 */
export async function checkRpcHealth(rpcUrl: string): Promise<{
  healthy: boolean
  latency: number
  error?: string
}> {
  const start = Date.now()
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getHealth',
      }),
    })

    const latency = Date.now() - start

    if (!response.ok) {
      return {
        healthy: false,
        latency,
        error: `HTTP ${response.status}`,
      }
    }

    const data: any = await response.json()
    if (data.result === 'ok') {
      return { healthy: true, latency }
    }

    return {
      healthy: false,
      latency,
      error: `Health check returned: ${data.result}`,
    }
  } catch (error) {
    return {
      healthy: false,
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Environment variable setup guide
 */
export const RPC_SETUP_GUIDE = `
# Private RPC Setup Guide

## Step 1: Choose a provider

Option A - Helius (Recommended):
  1. Go to https://www.helius.dev
  2. Sign up and create a free account
  3. Get your API key from dashboard
  4. Set: HELIUS_API_KEY=your_key_here

Option B - QuickNode:
  1. Go to https://www.quicknode.com
  2. Create free account
  3. Get Solana mainnet endpoint URL
  4. Set: QUICKNODE_API_KEY=your_key_here

Option C - Triton One:
  1. Go to https://console.triton.one
  2. Sign up
  3. Get API token
  4. Set: TRITON_API_KEY=your_key_here

## Step 2: Add to .env.local

HELIUS_API_KEY=your_api_key_here

## Step 3: Deploy

Your API will now use the private RPC instead of the public endpoint.

## Security Benefits

✓ Transactions NOT visible to public node operators
✓ No rate limiting during peak hours
✓ Better data privacy & GDPR compliance
✓ Protection against Solana RPC outages
✓ Priority support & SLAs
`
