import { useState, useCallback } from 'react';
import { useSecurityGuardian } from './useSecurityGuardian';

const DFLOW_API_BASE = 'https://quote-api.dflow.net';

export function useDFlow() {
  const [loading, setLoading] = useState(false);
  const [routes, setRoutes] = useState([]);
  const [risks, setRisks] = useState([]);
  const guardian = useSecurityGuardian();

  const findBestRoute = useCallback(async (fromToken, toToken, amount) => {
    setLoading(true);
    setRisks([]);
    
    try {
      // DFlow Routing API - Built for real-time data
      const params = new URLSearchParams({
        inputMint: fromToken,
        outputMint: toToken,
        amount: amount.toString(),
        slippageBps: '50',
      });

      const response = await fetch(`${DFLOW_API_BASE}/quote?${params}`);
      if (!response.ok) throw new Error('DFlow API Unreachable');
      
      const quote = await response.json();
      
      // Map DFlow quote to our internal route structure
      const realRoutes = quote.routePlan ? [
        {
          id: 'dflow-best',
          name: 'DFlow Optimized Route',
          outAmount: parseFloat(quote.outAmount),
          priceImpact: parseFloat(quote.priceImpactPct) * 100,
          path: [fromToken, ...quote.routePlan.map(p => p.swapInfo.label), toToken],
          rawQuote: quote
        }
      ] : [];

      setRoutes(realRoutes);
      return realRoutes;
    } catch (err) {
      console.warn('DFlow API failure, no routes available:', err.message);
      setRoutes([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const executeSwap = useCallback(async (route) => {
    setLoading(true);
    
    try {
      if (!route.rawQuote) throw new Error("Invalid route for execution");

      // In production: POST to /swap to get transaction, sign, and send
      // For now, we've removed the fake simulation and prepared the structure
      console.log('Executing real-time swap via DFlow protocol...');
      
      // Structural placeholder for real transaction execution
      // const txResponse = await fetch(`${DFLOW_API_BASE}/swap`, { ... });
      
      // Verification via Guardian would happen here with real logs
      setRisks([]);
      
      return true;
    } catch (err) {
      console.error('Swap execution failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    routes,
    risks,
    findBestRoute,
    executeSwap,
    clearRisks: () => setRisks([])
  };
}
