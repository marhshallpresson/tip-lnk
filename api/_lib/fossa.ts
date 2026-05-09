import axios from 'axios';
import { logger } from './logger.js';

const FOSSA_API_KEY = process.env.FOSSA_API_KEY || process.env.FOSSAPAY_SECRET_KEY;
const FOSSA_BASE_URL = process.env.FOSSA_BASE_URL || 'https://api-production.fossapay.com/api/v1';
const FOSSA_CHECKOUT_PATH = process.env.FOSSA_CHECKOUT_PATH;
const FOSSA_CUSTOMER_ID = process.env.FOSSA_CUSTOMER_ID;
const FOSSA_ACCOUNT_RESOLVE_PATH = process.env.FOSSA_ACCOUNT_RESOLVE_PATH;

const client = axios.create({
  baseURL: FOSSA_BASE_URL,
  timeout: 5000,
  headers: {
    'x-api-key': FOSSA_API_KEY,
    'Content-Type': 'application/json',
  },
});

const requestConfig = (idempotencyKey?: string) => ({
  headers: idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : undefined,
});

const responseData = (response: any) => response?.data?.data || response?.data || {};

const splitName = (name?: string | null) => {
  const parts = String(name || 'Tip Stack User').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || 'Tip',
    lastName: parts.slice(1).join(' ') || 'Stack',
  };
};

export async function createCustomer(input: {
  name?: string | null
  email?: string | null
  phone?: string | null
  intentId?: string | null
}, idempotencyKey?: string) {
  if (!FOSSA_API_KEY) {
    throw new Error('FOSSA_API_KEY is not configured');
  }

  const { firstName, lastName } = splitName(input.name);
  const emailAddress = input.email || `payments+${input.intentId || Date.now()}@tipstack.fun`;
  const response = await client.post('/customers', {
    firstName,
    lastName,
    emailAddress,
    mobileNumber: input.phone || process.env.FOSSA_DEFAULT_CUSTOMER_PHONE || '+2348000000000',
    dob: process.env.FOSSA_DEFAULT_CUSTOMER_DOB || '1990-01-01',
    address: process.env.FOSSA_DEFAULT_CUSTOMER_ADDRESS || 'Tip Stack Checkout',
    city: process.env.FOSSA_DEFAULT_CUSTOMER_CITY || 'Lagos',
    country: process.env.FOSSA_DEFAULT_CUSTOMER_COUNTRY || 'Nigeria',
    type: 'individual',
  }, requestConfig(idempotencyKey));

  const data = responseData(response);
  const customerId = data.customerId || data.id || data._id;
  if (!customerId) {
    throw new Error('FossaPay customer creation did not return a customer id');
  }
  return { customerId, raw: response.data };
}

export async function ensureCustomer(input: {
  customerId?: string | null
  name?: string | null
  email?: string | null
  phone?: string | null
  intentId?: string | null
}, idempotencyKey?: string) {
  if (input.customerId) return { customerId: input.customerId, raw: null };
  if (FOSSA_CUSTOMER_ID) return { customerId: FOSSA_CUSTOMER_ID, raw: null };
  return createCustomer(input, idempotencyKey);
}

export async function createFiatWallet(input: {
  customerId: string
  walletName: string
  walletReference: string
}, idempotencyKey?: string) {
  const response = await client.post('/wallets/fiat/create', {
    customerId: input.customerId,
    walletName: input.walletName,
    walletReference: input.walletReference,
  }, requestConfig(idempotencyKey));

  const data = responseData(response);
  const instructions = data.paymentInstructions || data.payment_instructions || data;

  return {
    id: data.walletId || data.id || input.walletReference,
    paymentInstructions: {
      type: 'bank_transfer',
      bankName: instructions.bankName || instructions.bank_name,
      bankCode: instructions.bankCode || instructions.bank_code,
      accountNumber: instructions.accountNumber || instructions.account_number,
      accountName: instructions.accountName || instructions.account_name || data.walletName || input.walletName,
      reference: input.walletReference,
    },
    raw: response.data,
  };
}

export async function createCheckoutSession(amount: number, creatorId: string, metadata: Record<string, any>, idempotencyKey?: string) {
  if (!FOSSA_API_KEY) {
    throw new Error('FOSSA_API_KEY is not configured');
  }

  try {
    if (FOSSA_CHECKOUT_PATH) {
      const response = await client.post(
        FOSSA_CHECKOUT_PATH,
        {
          amount,
          creatorId,
          metadata,
        },
        requestConfig(idempotencyKey)
      );
      return response.data;
    }

    const walletReference = metadata?.intentId || idempotencyKey || `${creatorId}-${Date.now()}`;
    const customer = await ensureCustomer({
      name: metadata?.senderName,
      email: metadata?.senderEmail,
      phone: metadata?.senderPhone,
      intentId: metadata?.intentId,
    }, `customer-${walletReference}`);

    return createFiatWallet({
      customerId: customer.customerId,
      walletName: `TipStack ${walletReference}`,
      walletReference,
    }, idempotencyKey);
  } catch (error) {
    logger.error('Fossa Pay: Error creating checkout session', { error });
    throw error;
  }
}

export async function createFiatPayout(input: {
  customerId: string
  destinationBankCode: string
  destinationAccountName: string
  destinationAccountNumber: string
  destinationBankName: string
  reference: string
  remarks: string
  amount: number
}, idempotencyKey?: string) {
  if (!FOSSA_API_KEY) {
    throw new Error('FOSSA_API_KEY is not configured');
  }

  const response = await client.post('/transfers/fiat/inter-bank', input, requestConfig(idempotencyKey || input.reference));
  return response.data;
}

export async function resolveFossaBankAccount(bankCode: string, accountNumber: string) {
  if (!FOSSA_API_KEY || !FOSSA_ACCOUNT_RESOLVE_PATH) return null;
  const response = await client.post(FOSSA_ACCOUNT_RESOLVE_PATH, {
    bankCode,
    accountNumber,
    currency: 'NGN',
  });
  const data = responseData(response);
  return data.accountName || data.account_name || data.name || data;
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
