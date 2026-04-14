import { useState, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, SystemProgram, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

/**
 * Transaction simulation hook — Solflare track requirement
 * Simulates transactions before signing for transparency
 */
export default function useTransactionSimulation() {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [simulation, setSimulation] = useState({
    result: null,
    loading: false,
    error: null,
  });

  const simulateTransfer = useCallback(
    async (recipientAddress, amountSOL) => {
      if (!publicKey) return;

      setSimulation({ result: null, loading: true, error: null });

      try {
        const recipient = new PublicKey(recipientAddress);
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: recipient,
            lamports: Math.round(amountSOL * LAMPORTS_PER_SOL),
          })
        );

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        // Simulate the transaction
        const simResult = await connection.simulateTransaction(transaction);

        const result = {
          success: !simResult.value.err,
          error: simResult.value.err,
          logs: simResult.value.logs || [],
          unitsConsumed: simResult.value.unitsConsumed || 0,
          estimatedFee: 0.000005, // ~5000 lamports
          balanceChange: -amountSOL,
          recipient: recipientAddress,
          amount: amountSOL,
        };

        setSimulation({ result, loading: false, error: null });
        return result;
      } catch (error) {
        setSimulation({ result: null, loading: false, error: error.message });
        return null;
      }
    },
    [publicKey, connection]
  );

  const clearSimulation = useCallback(() => {
    setSimulation({ result: null, loading: false, error: null });
  }, []);

  return { ...simulation, simulateTransfer, clearSimulation };
}
