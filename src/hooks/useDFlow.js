import { useState, useCallback } from 'react';
import { useSecurityGuardian } from './useSecurityGuardian';

const DFLOW_PROGRAM_ID = 'DFlw111111111111111111111111111111111111111';

export function useDFlow() {
  const [loading, setLoading] = useState(false);
  const [routes, setRoutes] = useState([]);
  const [risks, setRisks] = useState([]);
  const guardian = useSecurityGuardian();

  const findBestRoute = useCallback(async (fromToken, toToken, amount) => {
    setLoading(true);
    setRisks([]);
    
    // Simulate DFlow routing API call
    await new Promise(r => setTimeout(r, 1500));
    
    const possibleRoutes = [
      {
        id: 'direct',
        name: 'Direct Route (Saber)',
        outAmount: amount * 0.998,
        priceImpact: 0.1,
        path: [fromToken, toToken]
      },
      {
        id: 'split',
        name: 'Split Route (Orca + Raydium)',
        outAmount: amount * 1.002,
        priceImpact: 0.05,
        path: [fromToken, 'SOL', toToken]
      }
    ];

    setRoutes(possibleRoutes);
    setLoading(false);
    return possibleRoutes;
  }, []);

  const executeSwap = useCallback(async (route) => {
    setLoading(true);
    
    // Simulation Logs for Guardian
    const logs = [
      `Program ${DFLOW_PROGRAM_ID} invoke [1]`,
      "Program log: Instruction: RouteSwap",
      "Program log: Source: Raydium",
      "Program log: Destination: Orca",
      "Program log: Slippage checked: 0.5%",
      `Program ${DFLOW_PROGRAM_ID} success`
    ];

    const guardianRisks = guardian.analyzeSimulationLogs(logs);
    
    if (guardianRisks.some(r => r.severity === 'critical')) {
      setRisks(guardianRisks);
      setLoading(false);
      throw new Error("Security Guardian blocked swap: Malicious routing detected.");
    }

    setRisks(guardianRisks);
    await new Promise(r => setTimeout(r, 2000));
    setLoading(false);
    return true;
  }, [guardian]);

  return {
    loading,
    routes,
    risks,
    findBestRoute,
    executeSwap,
    clearRisks: () => setRisks([])
  };
}
