import type { Request as VercelRequest, Response as VercelResponse } from 'express'
import { db } from "../../../_lib/db.js"
import { randomUUID } from "crypto"
import { decrypt } from "../../../_lib/crypto.js"
import { createCustomer, createFiatWallet } from "../../../_lib/fossa.js"
import { rateLimit } from "../../../_lib/ratelimit.js"
import { getCryptoFiatQuote } from "../../../_lib/crypto-fiat-rates.js"
import { emitTorqueEvent } from "../../../_lib/torque.js"

const parseProfileData = (value: any) => {
  if (!value) return {}
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

const creatorWalletReference = (creatorId: string) =>
  `ts_creator_${creatorId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48)}`

const creatorDisplayName = (creator: any) =>
  creator?.name ||
  creator?.twitterHandle ||
  creator?.discordHandle ||
  creator?.solDomain ||
  `Creator ${String(creator?.id || '').slice(0, 8)}`

async function ensureCreatorCollectionAccount(creator: any) {
  const profileData = parseProfileData(creator.profileData)
  const fossaPay = profileData.fossaPay || {}
  const walletReference =
    fossaPay.collectionWalletReference ||
    profileData.fossa_collection_wallet_reference ||
    creatorWalletReference(creator.id)
  const storedAccount = fossaPay.collectionAccount || profileData.fossa_collection_account
  const storedCustomerId = fossaPay.customerId || profileData.fossa_customer_id || null

  if (
    storedAccount?.accountNumber &&
    (storedAccount.walletReference === walletReference || storedAccount.reference === walletReference)
  ) {
    return {
      customerId: storedCustomerId,
      walletReference,
      walletId: storedAccount.walletId || storedAccount.id || walletReference,
      paymentInstructions: {
        type: 'bank_transfer',
        bankName: storedAccount.bankName,
        bankCode: storedAccount.bankCode,
        accountNumber: storedAccount.accountNumber,
        accountName: storedAccount.accountName || creatorDisplayName(creator),
        reference: walletReference,
      },
      raw: null,
    }
  }

  const customer = storedCustomerId
    ? { customerId: storedCustomerId, raw: null }
    : await createCustomer({
        name: creatorDisplayName(creator),
        email: creator.email,
        phone: profileData.phone || profileData.mobileNumber || null,
        intentId: creator.id,
      }, `fossa-customer-${creator.id}`)

  const wallet = await createFiatWallet({
    customerId: customer.customerId,
    walletName: `TipStack Creator ${String(creator.id).slice(0, 8)}`,
    walletReference,
  }, `fossa-wallet-${walletReference}`)

  if (!wallet.paymentInstructions?.accountNumber) {
    throw new Error('FossaPay fiat wallet did not return a collection account number')
  }

  const collectionAccount = {
    walletId: wallet.id,
    walletReference,
    reference: walletReference,
    bankName: wallet.paymentInstructions.bankName,
    bankCode: wallet.paymentInstructions.bankCode,
    accountNumber: wallet.paymentInstructions.accountNumber,
    accountName: wallet.paymentInstructions.accountName,
    updatedAt: new Date().toISOString(),
  }

  await db('user').where({ id: creator.id }).update({
    profileData: JSON.stringify({
      ...profileData,
      fossa_customer_id: customer.customerId,
      fossa_collection_wallet_reference: walletReference,
      fossa_collection_account: collectionAccount,
      fossaPay: {
        ...fossaPay,
        customerId: customer.customerId,
        collectionWalletReference: walletReference,
        collectionAccount,
      },
    }),
    updated_at: new Date(),
  })

  return {
    customerId: customer.customerId,
    walletReference,
    walletId: wallet.id,
    paymentInstructions: wallet.paymentInstructions,
    raw: wallet.raw,
  }
}

/**
 * PHASE 2: Fossa Pay Fiat Intent
 * Generates a checkout session for Card/Bank inbound payments using Fossa Pay service.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!(await rateLimit(req, res))) return

  try {
    const { 
      creatorId, 
      amount, 
      senderName = 'Anonymous',
      memo = '' 
    } = req.body

    const normalizedAmount = Number(amount)
    if (!creatorId || !Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      return res.status(400).json({ error: 'Creator ID and a valid amount are required' })
    }

    const creator = await db('user')
      .where({ id: creatorId.replace('auth_', '') })
      .orWhere({ solDomain: creatorId })
      .orWhere({ walletAddress: creatorId })
      .first()

    let payoutAddress = creator?.walletAddress || null
    if (!payoutAddress && creator?.encryptedWalletAddress) {
      try {
        payoutAddress = decrypt(creator.encryptedWalletAddress)
      } catch (error) {
        console.error('Failed to decrypt creator payout address:', error)
      }
    }

    if (!creator || !payoutAddress) {
      return res.status(404).json({ error: 'Creator not found' })
    }

    const intentId = `fossa_${randomUUID().replace(/-/g, '')}`

    const platformFee = normalizedAmount * 0.05
    const finalAmountUsd = normalizedAmount - platformFee

    const quote = await getCryptoFiatQuote({
      amount: normalizedAmount,
      asset: 'USDC',
      quoteCurrency: 'NGN'
    })

    const baseIntentRecord = {
      intent_id: intentId,
      creator_id: creator.id,
      destination_wallet: creator.walletAddress || payoutAddress, // Store raw address for webhook matching
      amount_usd: normalizedAmount,
      status: 'requires_action',
      provider: 'fossapay',
      sender_name: senderName,
      memo,
      created_at: new Date(),
      updated_at: new Date()
    }

    try {
      const collectionAccount = await ensureCreatorCollectionAccount(creator)
      const paymentInstructions = {
        ...collectionAccount.paymentInstructions,
        walletId: collectionAccount.walletId,
        walletReference: collectionAccount.walletReference,
      }

      await db('fiat_payment_intents')
        .insert({
          ...baseIntentRecord,
          provider_session_id: collectionAccount.walletReference,
          metadata_json: JSON.stringify({
            platformFee,
            finalAmountUsd,
            expectedAmountNgn: quote.convertedAmount,
            rate: quote.rate,
            rateProvider: quote.provider,
            rateCoinId: quote.coinId,
            senderName,
            memo,
            fossaCustomerId: collectionAccount.customerId,
            fossaWalletId: collectionAccount.walletId,
            fossaWalletReference: collectionAccount.walletReference,
            fossaAccountNumber: paymentInstructions.accountNumber,
            fossaBankName: paymentInstructions.bankName,
            fossaBankCode: paymentInstructions.bankCode
          })
        })
        .onConflict('intent_id')
        .merge()

      // â”€â”€â”€ ELITE GROWTH: TORQUE EVENT â”€â”€â”€
      await emitTorqueEvent({
        event_type: 'tip_initiated',
        metadata: {
          creator_id: creator.id,
          amount_usd: normalizedAmount,
          token_symbol: 'USD',
          source: 'backend',
          provider: 'fossapay',
          intent_id: intentId
        }
      }).catch(err => console.error('[Torque] Intent event failed:', err.message));

      return res.json({
        success: true,
        intentId,
        status: 'requires_action',
        checkoutUrl: null,
        paymentInstructions: {
          ...paymentInstructions,
          amountNgn: quote.convertedAmount,
          amountUsd: normalizedAmount,
          rate: quote.rate
        },
        quote: {
          provider: quote.provider,
          coinId: quote.coinId,
          rate: quote.rate,
          amountNgn: quote.convertedAmount
        }
      })

    } catch (apiErr: any) {
      console.error('Fossa Pay Service Error:', apiErr.message)

      return res.status(502).json({
        success: false,
        error: 'Fiat payment provider unavailable',
        message: 'The FossaPay integration is currently unresponsive. Please try again later or use crypto.'
      })
    }

  } catch (err: any) {
    console.error('Fiat Intent Error:', err.message)
    return res.status(500).json({ success: false, error: 'Internal Server Error' })
  }
}
