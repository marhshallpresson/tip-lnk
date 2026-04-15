import { useState, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, SystemProgram, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { useSecurityGuardian } from './useSecurityGuardian';

/**
 * Hardened Transaction simulation hook
 * Integrates Security Guardian for risk assessment
 */
export default function useTransactionSimulation() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const guardian = useSecurityGuardian();
  const [simulation, setSimulation] = useState({
    result: null,
    loading: false,
    error: null,
    risks: [],
  });

  const simulateTransfer = useCallback(
    async (recipientAddress, amountSOL) => {
      if (!publicKey) return;

      setSimulation({ result: null, loading: true, error: null, risks: [] });

      try {
        const recipient = new PublicKey(recipientAddress);
        
        // Initial Guardian Check
        const recipientRisk = guardian.assessRecipient(recipientAddress);

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
        
        // Log Analysis
        const logRisks = guardian.analyzeSimulationLogs(simResult.value.logs || []);
        const totalRisks = recipientRisk.level !== 'Safe' ? [recipientRisk, ...logRisks] : logRisks;
        const riskScore = guardian.calculateRiskScore(totalRisks);

        const result = {
          success: !simResult.value.err,
          error: simResult.value.err,
          logs: simResult.value.logs || [],
          unitsConsumed: simResult.value.unitsConsumed || 0,
          estimatedFee: 0.000005, 
          balanceChange: -amountSOL,
          recipient: recipientAddress,
          amount: amountSOL,
        };

        setSimulation({ result, loading: false, error: null, risks: totalRisks, riskScore });
        return { result, risks: totalRisks, riskScore };
      } catch (error) {
        setSimulation({ result: null, loading: false, error: error.message, risks: [] });
        return null;
      }
    },
    [publicKey, connection, guardian]
  );

  const clearSimulation = useCallback(() => {
    setSimulation({ result: null, loading: false, error: null, risks: [] });
  }, []);

  return { ...simulation, simulateTransfer, clearSimulation };
}
