import { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

/**
 * Professional Transaction History Parser
 * Corrects identifying incoming vs outgoing transfers and supports SPL Tokens.
 */
export default function useTransactionHistory() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [history, setHistory] = useState({
    transactions: [],
    loading: true,
    error: null,
  });

  const fetchHistory = useCallback(async () => {
    if (!publicKey || !connected) {
      setHistory((h) => ({ ...h, loading: false }));
      return;
    }

    setHistory((h) => ({ ...h, loading: true, error: null }));

    try {
      // ─── Professional Helius Indexing Integration ───
      const isProd = import.meta.env.PROD;
      const API_BASE_URL = isProd ? window.location.origin : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005');
      const response = await fetch(`${API_BASE_URL}/api/solana/tips/${publicKey.toBase58()}`);
      
      if (!response.ok) throw new Error('Failed to fetch from indexer');
      
      const { tips } = await response.json();

      // Format for UI
      const transactions = tips.map(tip => ({
        signature: tip.signature,
        timestamp: new Date(tip.timestamp).getTime(),
        type: tip.recipient === publicKey.toBase58() ? 'tip_received' : 'tip_sent',
        status: tip.status,
        amount: parseFloat(tip.amount).toFixed(2),
        token: tip.tokenSymbol,
        isIncoming: tip.recipient === publicKey.toBase58(),
        counterparty: tip.recipient === publicKey.toBase58() ? tip.sender : tip.recipient,
      })).map(tx => ({
        ...tx,
        counterparty: tx.counterparty.slice(0, 4) + '...' + tx.counterparty.slice(-4)
      }));

      setHistory({ transactions, loading: false, error: null });

      // Trigger a silent backfill to keep the indexer fresh
      fetch(`${API_BASE_URL}/api/solana/backfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: publicKey.toBase58() }),
      }).catch(err => console.warn('Silent backfill failed', err));

    } catch (error) {
      console.error('History Fetch Fault:', error);
      setHistory((h) => ({ ...h, loading: false, error: 'Could not retrieve transaction history.' }));
    }
  }, [publicKey, connected]);

  useEffect(() => {
    if (connected && publicKey) fetchHistory();
  }, [fetchHistory, connected, publicKey]);

  return { ...history, refresh: fetchHistory };
}
