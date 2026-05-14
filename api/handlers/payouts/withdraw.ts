import type { Request as VercelRequest, Response as VercelResponse } from 'express'
import { randomUUID } from 'crypto'
import axios from 'axios'
import { db, getCreatorBalance } from '../../lib/db.js'
import { getSessionUser } from '../../lib/session.js'
import { getCryptoFiatQuote } from '../../lib/crypto-fiat-rates.js'
import { createCustomer, createFiatPayout } from '../../lib/fossa.js'
import { findNigerianBank } from '../../lib/nigeria-banks.js'
import { decrypt } from '../../lib/crypto.js'

const parseProfileData = (value: any) => {
  if (!value) return {}
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

async function ensureCreatorFossaCustomer(user: any) {
  const profileData = parseProfileData(user.profileData)
  const existingCustomerId = profileData.fossaPay?.customerId || profileData.fossa_customer_id
  if (existingCustomerId) return existingCustomerId

  const customer = await createCustomer({
    name: user.name || user.full_name || 'Tip Stack Creator',
    email: user.email,
    phone: profileData.phone || profileData.mobileNumber || null,
    intentId: user.id,
  }, `fossa-customer-${user.id}`)

  await db('user').where({ id: user.id }).update({
    profileData: JSON.stringify({
      ...profileData,
      fossa_customer_id: customer.customerId,
      fossaPay: {
        ...(profileData.fossaPay || {}),
        customerId: customer.customerId,
      },
    }),
    updated_at: new Date(),
  })

  return customer.customerId
}

const normalizeProvider = (value: any) => {
  const provider = String(value || 'pajcash').toLowerCase()
  if (['fossa', 'fossapay', 'fiatpay', 'fosapi'].includes(provider)) return 'fossapay'
  return 'pajcash'
}

/**
 * Creator withdrawal endpoint.
 * - provider=pajcash: USDC to NGN off-ramp through Pajcash.
 * - provider=fossapay: direct fiat payout through FossaPay.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user = await getSessionUser(req as any)
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const provider = normalizeProvider(req.body?.provider)
    const { amountUSDC } = req.body
    const withdrawAmount = Number(amountUSDC)

    if (!withdrawAmount || isNaN(withdrawAmount) || withdrawAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' })
    }

    // ─── ELITE SECURITY: TRANSACTIONAL LEDGER LOCK ───
    // We wrap the entire balance check and payout creation in a transaction.
    const result = await db.transaction(async (trx) => {
      // 1. Lock the user record to prevent concurrent withdrawals
      const lockedUser = await trx('user')
        .where({ id: user.id })
        .forUpdate()
        .first()

      if (!lockedUser) throw new Error('user_not_found')

      // Resolve address (support encrypted or legacy)
      const payoutAddress = lockedUser.walletAddress || (lockedUser.encryptedWalletAddress ? decrypt(lockedUser.encryptedWalletAddress) : null);
      if (!payoutAddress) {
        return { error: 'No wallet address linked to account', status: 400 }
      }

      // 2. Calculate balance inside the transaction
      // We pass the transaction instance to ensure we see the most recent committed state
      const ledger = await getCreatorBalance(user.id, trx)
      if (withdrawAmount > ledger.balance) {
        return {
          error: 'Insufficient Balance',
          message: `You attempted to withdraw $${withdrawAmount} but only have $${ledger.balance.toFixed(2)} available.`,
          status: 400
        }
      }

      const quote = await getCryptoFiatQuote({
        amount: withdrawAmount,
        asset: 'USDC',
        quoteCurrency: 'NGN',
      })
      const amountNGN = Math.round(quote.convertedAmount)

      const reference = provider === 'fossapay' 
        ? `FOSSA-${randomUUID().replace(/-/g, '').slice(0, 16)}`
        : `PAJ-${randomUUID().replace(/-/g, '').slice(0, 16)}`

      if (provider === 'fossapay') {
        const bankCode = String(req.body?.bankCode || req.body?.bank || '').trim()
        const accountNumber = String(req.body?.accountNumber || '').replace(/\D/g, '')
        const accountName = String(req.body?.accountName || '').trim()
        const bank = findNigerianBank(bankCode)

        if (!bank || accountNumber.length < 10 || !accountName) {
          return {
            error: 'Bank details required',
            message: 'Select a supported Nigerian bank, enter a valid account number, and confirm the account name.',
            status: 400
          }
        }

        const customerId = await ensureCreatorFossaCustomer(lockedUser)
        const rawPayload = {
          provider: 'fossapay',
          amountUSDC: withdrawAmount,
          amountNGN,
          rate: quote.rate,
          rateProvider: quote.provider,
          bankCode: bank.code,
          bankName: bank.name,
          accountNumber,
          accountName,
          customerId,
        }

        // Insert pending payout record
        await trx('payouts').insert({
          pajcash_reference: reference,
          status: 'pending',
          amount_ngn: amountNGN,
          wallet_address: payoutAddress,
          user_id: lockedUser.id,
          raw_payload: JSON.stringify(rawPayload),
          updated_at: new Date(),
        })

        return {
          type: 'fossapay',
          reference,
          customerId,
          bank,
          accountNumber,
          accountName,
          amountNGN,
          withdrawAmount,
          rawPayload,
          quote,
          payoutAddress
        }
      } else {
        const PAJCASH_API_KEY = process.env.PAJCASH_API_KEY
        if (!PAJCASH_API_KEY || PAJCASH_API_KEY === 'NEVER_COMMIT_THIS') {
          return {
            error: 'Payouts Disabled',
            message: 'Pajcash integration is not configured for this environment.',
            status: 503
          }
        }

        await trx('payouts').insert({
          pajcash_reference: reference,
          status: 'pending',
          amount_ngn: amountNGN,
          wallet_address: payoutAddress,
          user_id: lockedUser.id,
          raw_payload: JSON.stringify({
            provider: 'pajcash',
            amountUSDC: withdrawAmount,
            amountNGN,
            rate: quote.rate,
            rateProvider: quote.provider,
          }),
          updated_at: new Date(),
        })

        return {
          type: 'pajcash',
          reference,
          amountNGN,
          withdrawAmount,
          walletAddress: payoutAddress
        }
      }
    })

    if ('error' in result) {
      return res.status(result.status || 400).json({ error: result.error, message: result.message })
    }

    // ─── ELITE SECURITY: OUTBOUND IDEMPOTENCY ───
    // We execute the external API calls OUTSIDE the DB transaction to avoid long-held locks,
    // but use the pre-generated reference as the Idempotency-Key.

    if (result.type === 'fossapay' && result.bank && result.accountName && result.accountNumber && result.customerId) {
      try {
        const response = await createFiatPayout({
          customerId: result.customerId,
          destinationBankCode: result.bank.code,
          destinationAccountName: result.accountName,
          destinationAccountNumber: result.accountNumber,
          destinationBankName: result.bank.name,
          reference: result.reference,
          remarks: `TipStack creator withdrawal ${result.reference}`,
          amount: result.amountNGN,
        }, result.reference)

        await db('payouts').where({ pajcash_reference: result.reference }).update({
          status: 'submitted',
          raw_payload: JSON.stringify({
            ...result.rawPayload,
            providerResponse: response,
          }),
          updated_at: new Date(),
        })

        return res.status(200).json({
          success: true,
          provider: 'fossapay',
          reference: result.reference,
          status: 'submitted',
          amountNGN: result.amountNGN,
          amountUSDC: result.withdrawAmount,
        })
      } catch (apiErr: any) {
        console.error('FossaPay payout API error:', apiErr.response?.data || apiErr.message)
        await db('payouts').where({ pajcash_reference: result.reference }).update({
          status: 'failed',
          updated_at: new Date(),
        })
        return res.status(502).json({ error: 'Failed to initiate FossaPay payout' })
      }
    } else {
      const PAJCASH_API_KEY = process.env.PAJCASH_API_KEY
      const PAJCASH_BASE_URL = process.env.PAJCASH_BASE_URL || 'https://api.pajcash.com'

      try {
        const response = await axios.post(`${PAJCASH_BASE_URL}/api/v1/offramp/initiate`, {
          amount: result.amountNGN,
          currency: 'NGN',
          reference: result.reference,
          walletAddress: result.walletAddress,
          webhookUrl: `${process.env.API_URL || 'https://tip-lnk.vercel.app'}/api/payouts/webhook`,
        }, {
          headers: { 
            Authorization: `Bearer ${PAJCASH_API_KEY}`,
            'Idempotency-Key': result.reference // Standard IETF Idempotency Header
          },
        })

        return res.status(200).json({
          success: true,
          provider: 'pajcash',
          checkoutUrl: response.data?.checkoutUrl || 'https://checkout.pajcash.com/' + result.reference,
          address: response.data?.address,
          reference: result.reference,
        })
      } catch (apiErr: any) {
        console.error('Pajcash API Error:', apiErr.response?.data || apiErr.message)
        await db('payouts').where({ pajcash_reference: result.reference }).update({ status: 'failed', updated_at: new Date() })
        return res.status(500).json({ error: 'Failed to initiate Pajcash off-ramp' })
      }
    }
  } catch (err: any) {
    console.error('Payouts Withdraw Error:', err)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
