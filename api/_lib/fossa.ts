import axios from 'axios';
import { logger } from './logger.js';

const FOSSA_API_KEY = process.env.FOSSA_API_KEY || process.env.FOSSAPAY_SECRET_KEY;
const FOSSA_BASE_URL = process.env.FOSSA_BASE_URL || 'https://api-production.fossapay.com/api/v1';
const FOSSA_CHECKOUT_PATH = process.env.FOSSA_CHECKOUT_PATH;
const FOSSA_COLLECTION_CUSTOMER_ID = process.env.FOSSA_COLLECTION_CUSTOMER_ID || process.env.FOSSA_CUSTOMER_ID;

const client = axios.create({
  baseURL: FOSSA_BASE_URL,
  timeout: 5000,
  headers: {
    'x-api-key': FOSSA_API_KEY,
    'Content-Type': 'application/json',
  },
});

export async function createCheckoutSession(amount: number, creatorId: string, metadata: Record<string, any>, idempotencyKey?: string) {
  if (!FOSSA_API_KEY) {
    throw new Error('FOSSA_API_KEY is not configured');
  }

  try {
    const requestConfig = {
      headers: idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : undefined,
    };

    if (FOSSA_CHECKOUT_PATH) {
      const response = await client.post(
        FOSSA_CHECKOUT_PATH,
        {
          amount,
          creatorId,
          metadata,
        },
        requestConfig
      );
      return response.data;
    }

    if (!FOSSA_COLLECTION_CUSTOMER_ID) {
      throw new Error('FOSSA_CHECKOUT_PATH or FOSSA_COLLECTION_CUSTOMER_ID is not configured');
    }

    const walletReference = metadata?.intentId || idempotencyKey || `${creatorId}-${Date.now()}`;
    const response = await client.post(
      '/wallets/fiat/create',
      {
        customerId: FOSSA_COLLECTION_CUSTOMER_ID,
        walletName: `TipStack ${walletReference}`,
        walletReference,
      },
      requestConfig
    );

    const data = response.data?.data || response.data || {};
    return {
      id: data.walletId || data.id || walletReference,
      paymentInstructions: {
        type: 'bank_transfer',
        bankName: data.bankName,
        bankCode: data.bankCode,
        accountNumber: data.accountNumber,
        accountName: data.accountName || data.walletName || 'Tip Stack',
        reference: walletReference,
      },
      raw: response.data,
    };
  } catch (error) {
    logger.error('Fossa Pay: Error creating checkout session', { error });
    throw error;
  }
}

export async function verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
  try {
    // According to Fossa Pay docs, verify signature using public key or shared secret
    const response = await client.post('/webhooks/verify', { payload, signature });
    return response.data.valid === true;
  } catch (error) {
    logger.error('Fossa Pay: Error verifying webhook signature', { error });
    return false;
  }
}
