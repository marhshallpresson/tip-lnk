import { useState, useEffect, useCallback } from 'react';

const SANCTUM_API_BASE = 'https://sanctum-api.ironforge.network';

/**
 * Professional Sanctum LST Hook
 * Fetches real-time yields and metadata for LST-based tipping.
 */
export function useSanctum() {
  const [lsts, setLsts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLsts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${SANCTUM_API_BASE}/lsts`);
      if (!response.ok) throw new Error('Sanctum API unreachable');
      const data = await response.json();
      
      // Filter for major LSTs to keep UI clean
      const majorSymbols = ['INF', 'jupSOL', 'jitoSOL', 'mSOL', 'bSOL'];
      const filtered = data.filter(lst => majorSymbols.includes(lst.symbol));
      
      setLsts(filtered);
    } catch (err) {
      console.error('Sanctum Fetch Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLsts();
  }, [fetchLsts]);

  return { lsts, loading, error, refresh: fetchLsts };
}
