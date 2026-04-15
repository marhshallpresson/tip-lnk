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
      const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 15 });
      if (signatures.length === 0) {
        setHistory({ transactions: [], loading: false, error: null });
        return;
      }

      const sigStrings = signatures.map(s => s.signature);
      const parsedTransactions = await connection.getParsedTransactions(sigStrings, { 
        maxSupportedTransactionVersion: 0 
      });

      const transactions = parsedTransactions.map((tx, i) => {
        if (!tx) return null;

        const sig = signatures[i];
        let amount = 0;
        let type = 'transfer';
        let isIncoming = false;
        let counterparty = 'System';
        let tokenSymbol = 'SOL';

        // ─── Instruction Analysis ───
        tx.transaction.message.instructions.forEach(ix => {
          // SOL Transfer
          if (ix.program === 'system' && ix.parsed?.type === 'transfer') {
            const { info } = ix.parsed;
            amount = info.lamports / LAMPORTS_PER_SOL;
            if (info.destination === publicKey.toString()) {
              isIncoming = true;
              counterparty = info.source;
              type = 'tip_received';
            } else {
              isIncoming = false;
              counterparty = info.destination;
              type = 'tip_sent';
            }
          }
          
          // SPL Token Transfer (USDC/BONK)
          if ((ix.program === 'spl-token' || ix.program === 'spl-token-2022') && ix.parsed?.type === 'transfer') {
            const { info } = ix.parsed;
            amount = parseFloat(info.amount) / 10**6; // Assumes USDC for now
            tokenSymbol = 'USDC';
            type = info.authority === publicKey.toString() ? 'tip_sent' : 'tip_received';
            isIncoming = type === 'tip_received';
            counterparty = isIncoming ? 'Payer' : 'Creator';
          }
        });

        return {
          signature: sig.signature,
          timestamp: sig.blockTime ? sig.blockTime * 1000 : Date.now(),
          type,
          status: sig.confirmationStatus || 'confirmed',
          err: tx.meta?.err,
          amount: amount.toFixed(2),
          token: tokenSymbol,
          isIncoming,
          counterparty: counterparty.length > 8 ? `${counterparty.slice(0, 4)}...${counterparty.slice(-4)}` : counterparty
        };
      }).filter(Boolean);

      setHistory({ transactions, loading: false, error: null });
    } catch (error) {
      console.error('History Fetch Fault:', error);
      setHistory((h) => ({ ...h, loading: false, error: 'Could not retrieve transaction history.' }));
    }
  }, [publicKey, connected, connection]);

  useEffect(() => {
    if (connected && publicKey) fetchHistory();
  }, [fetchHistory, connected, publicKey]);

  return { ...history, refresh: fetchHistory };
}
