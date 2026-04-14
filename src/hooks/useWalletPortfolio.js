import { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

/**
 * Wallet portfolio analytics hook — Solflare track requirement
 * Fetches SOL balance and simulated token holdings + NFT count
 */
export default function useWalletPortfolio() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [portfolio, setPortfolio] = useState({
    solBalance: 0,
    tokens: [],
    nfts: [],
    totalValueUSD: 0,
    loading: true,
    error: null,
  });

  const fetchPortfolio = useCallback(async () => {
    if (!publicKey || !connected) {
      setPortfolio((p) => ({ ...p, loading: false }));
      return;
    }

    setPortfolio((p) => ({ ...p, loading: true, error: null }));

    try {
      // Fetch SOL balance
      const balance = await connection.getBalance(publicKey);
      const solBalance = balance / LAMPORTS_PER_SOL;

      // Simulated token holdings (in production: use QuickNode DAS API)
      const tokens = [
        { mint: 'USDC', symbol: 'USDC', name: 'USD Coin', balance: 142.50, valueUSD: 142.50, icon: '💵' },
        { mint: 'SOL', symbol: 'SOL', name: 'Solana', balance: solBalance, valueUSD: solBalance * 180, icon: '◎' },
        { mint: 'BONK', symbol: 'BONK', name: 'Bonk', balance: 5820000, valueUSD: 125.40, icon: '🐕' },
      ];

      // Simulated NFT count
      const nfts = [
        { name: 'Doodle #4231', collection: 'Doodles', image: null, isDoodle: true },
        { name: 'DeGod #891', collection: 'DeGods', image: null, isDoodle: false },
      ];

      const totalValueUSD = tokens.reduce((sum, t) => sum + t.valueUSD, 0);

      setPortfolio({
        solBalance,
        tokens,
        nfts,
        totalValueUSD,
        loading: false,
        error: null,
      });
    } catch (error) {
      setPortfolio((p) => ({
        ...p,
        loading: false,
        error: error.message,
      }));
    }
  }, [publicKey, connected, connection]);

  useEffect(() => {
    fetchPortfolio();
    // Refresh every 30s
    const interval = setInterval(fetchPortfolio, 30000);
    return () => clearInterval(interval);
  }, [fetchPortfolio]);

  return { ...portfolio, refresh: fetchPortfolio };
}
