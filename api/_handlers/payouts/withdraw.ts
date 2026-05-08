import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomUUID } from 'crypto'
import axios from 'axios'
import { db, getCreatorBalance } from '../../_lib/db.js'
import { getSessionUser } from '../../_lib/session.js'
import { getCryptoFiatQuote } from '../../_lib/crypto-fiat-rates.js'
import { createCustomer, createFiatPayout } from '../../_lib/fossa.js'
import { findNigerianBank } from '../../_lib/nigeria-banks.js'

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

    const ledger = await getCreatorBalance(user.id)
    if (withdrawAmount > ledger.balance) {
      return res.status(400).json({
        error: 'Insufficient Balance',
        message: `You attempted to withdraw $${withdrawAmount} but only have $${ledger.balance.toFixed(2)} available.`,
      })
    }

    if (!user.walletAddress) {
      return res.status(400).json({ error: 'No wallet address linked to account' })
    }

    const quote = await getCryptoFiatQuote({
      amount: withdrawAmount,
      asset: 'USDC',
      quoteCurrency: 'NGN',
    })
    const amountNGN = Math.round(quote.convertedAmount)

    if (provider === 'fossapay') {
      const bankCode = String(req.body?.bankCode || req.body?.bank || '').trim()
      const accountNumber = String(req.body?.accountNumber || '').replace(/\D/g, '')
      const accountName = String(req.body?.accountName || '').trim()
      const bank = findNigerianBank(bankCode)

      if (!bank || accountNumber.length < 10 || !accountName) {
        return res.status(400).json({
          error: 'Bank details required',
          message: 'Select a supported Nigerian bank, enter a valid account number, and confirm the account name.',
        })
      }

      const reference = `FOSSA-${randomUUID().replace(/-/g, '').slice(0, 16)}`
      const customerId = await ensureCreatorFossaCustomer(user)
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

      await db('payouts').insert({
        pajcash_reference: reference,
        status: 'pending',
        amount_ngn: amountNGN,
        wallet_address: user.walletAddress,
        user_id: user.id,
        raw_payload: JSON.stringify(rawPayload),
        updated_at: new Date(),
      })

      try {
        const response = await createFiatPayout({
          customerId,
          destinationBankCode: bank.code,
          destinationAccountName: accountName,
          destinationAccountNumber: accountNumber,
          destinationBankName: bank.name,
          reference,
          remarks: `TipStack creator withdrawal ${reference}`,
          amount: amountNGN,
        }, reference)

        await db('payouts').where({ pajcash_reference: reference }).update({
          status: 'submitted',
          raw_payload: JSON.stringify({
            ...rawPayload,
            providerResponse: response,
          }),
          updated_at: new Date(),
        })

        return res.status(200).json({
          success: true,
          provider: 'fossapay',
          reference,
          status: 'submitted',
          amountNGN,
          amountUSDC: withdrawAmount,
        })
      } catch (apiErr: any) {
        console.error('FossaPay payout API error:', apiErr.response?.data || apiErr.message)
        await db('payouts').where({ pajcash_reference: reference }).update({
          status: 'failed',
          updated_at: new Date(),
        })
        return res.status(502).json({ error: 'Failed to initiate FossaPay payout' })
      }
    }

    const reference = `PAJ-${randomUUID().replace(/-/g, '').slice(0, 16)}`
    const PAJCASH_API_KEY = process.env.PAJCASH_API_KEY
    const PAJCASH_BASE_URL = process.env.PAJCASH_BASE_URL || 'https://api.pajcash.com'

    if (!PAJCASH_API_KEY || PAJCASH_API_KEY === 'NEVER_COMMIT_THIS') {
      return res.status(503).json({
        error: 'Payouts Disabled',
        message: 'Pajcash integration is not configured for this environment.',
      })
    }

    await db('payouts').insert({
      pajcash_reference: reference,
      status: 'pending',
      amount_ngn: amountNGN,
      wallet_address: user.walletAddress,
      user_id: user.id,
      raw_payload: JSON.stringify({
        provider: 'pajcash',
        amountUSDC: withdrawAmount,
        amountNGN,
        rate: quote.rate,
        rateProvider: quote.provider,
      }),
      updated_at: new Date(),
    })

    try {
      const response = await axios.post(`${PAJCASH_BASE_URL}/api/v1/offramp/initiate`, {
        amount: amountNGN,
        currency: 'NGN',
        reference,
        walletAddress: user.walletAddress,
        webhookUrl: `${process.env.API_URL || 'https://tip-lnk.vercel.app'}/api/payouts/webhook`,
      }, {
        headers: { Authorization: `Bearer ${PAJCASH_API_KEY}` },
      })

      return res.status(200).json({
        success: true,
        provider: 'pajcash',
        checkoutUrl: response.data?.checkoutUrl || 'https://checkout.pajcash.com/' + reference,
        address: response.data?.address,
        reference,
      })
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
