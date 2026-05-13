import type { Request as VercelRequest, Response as VercelResponse } from 'express'
import { resolveFossaBankAccount } from '../../lib/fossa.js'
import { findNigerianBank } from '../../lib/nigeria-banks.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const bankCode = String(req.body?.bankCode || req.body?.bank || '').trim()
  const accountNumber = String(req.body?.accountNumber || '').replace(/\D/g, '')
  if (!bankCode || accountNumber.length < 10) {
    return res.status(400).json({ success: false, error: 'bankCode and a valid accountNumber are required' })
  }

  const bank = findNigerianBank(bankCode)
  if (!bank) return res.status(400).json({ success: false, error: 'Unsupported bank' })

  const resolved = await resolveFossaBankAccount(bank.code, accountNumber)
  const accountName = typeof resolved === 'string' && resolved.trim()
    ? resolved.trim()
    : `Account ending ${accountNumber.slice(-4)}`

  return res.status(200).json({
    success: true,
    verified: Boolean(resolved),
    bank,
    accountName,
    accountNumber,
  })
}
