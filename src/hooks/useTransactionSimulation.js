import { useState, useCallback } from 'react';
import axios from 'axios';

/**
 * Elite Transaction Simulation (Helius / Solana RPC)
 * Provides a pre-flight view of transaction impact before signing.
 */
export function useTransactionSimulation() {
  const [simulation, setSimulation] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState(null);

  const simulate = useCallback(async (transactionBase64) => {
    setSimulating(true);
    setError(null);
    try {
      const isProd = import.meta.env.PROD;
      const API_BASE_URL = isProd ? window.location.origin : (import.meta.env.VITE_API_BASE_URL);

      // We route through our hardened backend proxy to keep keys secure
      const response = await fetch(`${API_BASE_URL}/api/quicknode/rpc/solana`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'simulateTransaction',
          params: [
            transactionBase64,
            {
              encoding: 'base64',
              commitment: 'confirmed',
              replaceRecentBlockhash: true,
              innerInstructions: true
            }
          ]
        })
      });

      const data = await response.json();

      if (data.error) throw new Error(data.error.message);

      const result = data.result.value;
      if (result.err) {
        setError(`Simulation Warning: ${JSON.stringify(result.err)}`);
      }

      setSimulation(result);
      return result;
    } catch (err) {
      console.error('Simulation Fault:', err);
      setError('Could not simulate transaction.');
      return null;
    } finally {
      setSimulating(false);
    }
  }, []);

  return { simulate, simulation, simulating, error };
}
