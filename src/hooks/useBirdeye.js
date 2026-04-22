import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

/**
 * Elite Birdeye Data Intelligence Hook
 * Powers the creator analytics with real-time portfolio value and sentiment.
 */
export function useBirdeye() {
  const { publicKey, connected } = useWallet();
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchInsights = useCallback(async () => {
    if (!publicKey || !connected) return;
    setLoading(true);

    try {
      const isProd = import.meta.env.PROD;
      const API_BASE = isProd ? window.location.origin : (import.meta.env.VITE_API_BASE_URL);
      
      const response = await fetch(`${API_BASE}/api/solana/birdeye/portfolio?address=${publicKey.toBase58()}`);
      const data = await response.json();

      if (data.success) {
        setInsights(data.insights);
      }
    } catch (err) {
      console.error('🛡️ Birdeye: Analysis fault.', err);
    } finally {
      setLoading(false);
    }
  }, [publicKey, connected]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  return { insights, loading, refresh: fetchInsights };
}
