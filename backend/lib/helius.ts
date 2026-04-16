import axios from 'axios';
import dotenv from 'dotenv';
import { db } from './db.js';

dotenv.config();

const HELIUS_API_KEY = process.env.HELIUS_API_KEY || '67041793-1959-450a-b586-7a1362e49c71'; // Fallback for dev
const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const HELIUS_API_URL = `https://api.helius.xyz/v0`;

export interface HeliusTip {
  signature: string;
  slot: number;
  timestamp: number;
  sender: string;
  recipient: string;
  amount: number;
  tokenMint: string;
  tokenSymbol: string;
  status: string;
  type: string;
}

/**
 * Helius Professional Indexing Engine
 * Implements gTFA (getTransactionsForAddress) for chronological backfilling.
 */
export async function backfillTransactions(address: string, limit = 100) {
  try {
    const { data } = await axios.post(HELIUS_RPC_URL, {
      jsonrpc: '2.0',
      id: 'backfill',
      method: 'getTransactionsForAddress',
      params: [
        address,
        {
          limit,
          sortOrder: 'DESC', // Newest first
        },
      ],
    });

    if (!data.result) return [];

    const parsedTips: HeliusTip[] = data.result.map((tx: any) => {
      // Logic to extract tip data from Enhanced Transaction schema
      // This is a simplified version of the logic in useTransactionHistory.js but on server-side
      const isIncoming = tx.nativeTransfers.some((t: any) => t.toUserAccount === address);
      const nativeTransfer = tx.nativeTransfers[0];
      const tokenTransfer = tx.tokenTransfers[0];

      if (nativeTransfer) {
        return {
          signature: tx.signature,
          slot: tx.slot,
          timestamp: tx.timestamp * 1000,
          sender: nativeTransfer.fromUserAccount,
          recipient: nativeTransfer.toUserAccount,
          amount: nativeTransfer.amount / 1e9,
          tokenMint: 'So11111111111111111111111111111111111111112',
          tokenSymbol: 'SOL',
          status: 'confirmed',
          type: 'tip',
        };
      } else if (tokenTransfer) {
        return {
          signature: tx.signature,
          slot: tx.slot,
          timestamp: tx.timestamp * 1000,
          sender: tokenTransfer.fromUserAccount,
          recipient: tokenTransfer.toUserAccount,
          amount: tokenTransfer.tokenAmount,
          tokenMint: tokenTransfer.mint,
          tokenSymbol: tokenTransfer.mint.includes('EPjFW') ? 'USDC' : 'TOKEN',
          status: 'confirmed',
          type: 'tip',
        };
      }
      return null;
    }).filter(Boolean);

    // Bulk UPSERT into database
    for (const tip of parsedTips) {
      await db('tips').insert(tip).onConflict('signature').merge();
    }

    // Update indexer state
    if (parsedTips.length > 0) {
      const maxSlot = Math.max(...parsedTips.map(t => t.slot));
      await db('indexer_state').insert({
        address,
        lastIndexedSlot: maxSlot,
        updatedAt: new Date()
      }).onConflict('address').merge();
    }

    return parsedTips;
  } catch (err) {
    console.error('Helius Indexing Error:', err);
    throw err;
  }
}

/**
 * Helius Priority Fee API
 * Professional landing rates for transactions.
 */
export async function getPriorityFeeEstimate(accountAddresses: string[]) {
  try {
    const { data } = await axios.post(HELIUS_RPC_URL, {
      jsonrpc: '2.0',
      id: 'priority-fee',
      method: 'getPriorityFeeEstimate',
      params: [
        {
          accountKeys: accountAddresses,
          options: {
            includeAllPriorityFeeLevels: true,
          },
        },
      ],
    });
    return data.result.priorityFeeLevels;
  } catch (err) {
    console.error('Priority Fee Error:', err);
    return { medium: 10000, high: 50000, veryHigh: 100000 };
  }
}

/**
 * Helius DAS API - Asset Fetching
 * High-speed retrieval of NFTs and Fungible Tokens.
 */
export async function getAssetsByOwner(owner: string) {
  try {
    const { data } = await axios.post(HELIUS_RPC_URL, {
      jsonrpc: '2.0',
      id: 'das',
      method: 'getAssetsByOwner',
      params: {
        ownerAddress: owner,
        page: 1,
        limit: 100,
        displayOptions: {
          showFungible: true,
        },
      },
    });
    return data.result;
  } catch (err) {
    console.error('DAS API Error:', err);
    throw err;
  }
}
