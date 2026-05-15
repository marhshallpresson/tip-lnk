import type { Request as VercelRequest, Response as VercelResponse } from 'express'
import { getSessionUser } from "../../_lib/session.js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const sessionUser = await getSessionUser(req as any)
    if (!sessionUser) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }

    const maskedAddress = sessionUser.walletAddress 
        ? `${sessionUser.walletAddress.slice(0, 4)}...${sessionUser.walletAddress.slice(-4)}`
        : null;

    const { encryptedWalletAddress, walletAddressHash, ...safeUser } = sessionUser;

    res.status(200).json({ 
        success: true, 
        user: {
            ...safeUser,
            walletAddress: maskedAddress
        } 
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}
