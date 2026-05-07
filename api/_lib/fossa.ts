import axios from 'axios';
import { logger } from './logger.js';

const FOSSA_API_KEY = process.env.FOSSA_API_KEY;
const FOSSA_BASE_URL = process.env.FOSSA_BASE_URL || 'https://api.fossapay.com';

const client = axios.create({
  baseURL: FOSSA_BASE_URL,
  timeout: 5000,
  headers: {
    'Authorization': `Bearer ${FOSSA_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

export async function createCheckoutSession(amount: number, creatorId: string, metadata: object) {
  try {
    const response = await client.post('/v1/sessions', {
      amount,
      creatorId,
      metadata,
    });
    return response.data;
  } catch (error) {
    logger.error('Fossa Pay: Error creating checkout session', { error });
    throw error;
  }
}

export async function verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
  try {
    // According to Fossa Pay docs, verify signature using public key or shared secret
    const response = await client.post('/v1/webhooks/verify', { payload, signature });
    return response.data.valid === true;
  } catch (error) {
    logger.error('Fossa Pay: Error verifying webhook signature', { error });
    return false;
  }
}
