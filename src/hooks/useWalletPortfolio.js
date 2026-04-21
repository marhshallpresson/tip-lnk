import { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

/**
 * Elite Wallet Portfolio (DAS API / Solflare Track Standard)
 * Implements high-performance asset indexing via the TipLnk Helius Proxy.
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
      const isProd = import.meta.env.PROD;
      const API_BASE_URL = isProd ? window.location.origin : (import.meta.env.VITE_API_BASE_URL);

      // ─── Parallel Elite Data Fetching ───
      const [balance, priceRes, assetRes] = await Promise.all([
        connection.getBalance(publicKey),
        fetch('https://price.jup.ag/v6/price?ids=SOL,USDC').then(r => r.json()),
        fetch(`${API_BASE_URL}/api/solana/assets/${publicKey.toBase58()}`).then(r => r.json())
      ]);

      const solBalance = balance / LAMPORTS_PER_SOL;
      const solPrice = priceRes.data?.SOL?.price || 180;
      const usdcPrice = priceRes.data?.USDC?.price || 1;

      // ─── Professional DAS API Transformation ───
      const rawAssets = assetRes.assets?.items || [];

      const tokens = rawAssets
        .filter(item => item.interface === 'FungibleToken' || item.interface === 'FungibleAsset')
        .map(item => ({
          mint: item.id,
          symbol: item.content?.metadata?.symbol || 'TOKEN',
          name: item.content?.metadata?.name || 'Unknown Asset',
          balance: item.token_info?.balance / Math.pow(10, item.token_info?.decimals || 0),
          valueUSD: (item.token_info?.balance / Math.pow(10, item.token_info?.decimals || 0)) * (item.token_info?.price_info?.price_per_token || 0),
          icon: item.content?.links?.image || '◎'
        }));

      // Add SOL manually as DAS usually excludes native SOL
      tokens.unshift({
        mint: 'So11111111111111111111111111111111111111112',
        symbol: 'SOL',
        name: 'Solana',
        balance: solBalance,
        valueUSD: solBalance * solPrice,
        icon: '/favicon.svg'
      });

      const nfts = rawAssets
        .filter(item => item.interface === 'ProgrammableNFT' || item.interface === 'V1_NFT' || item.interface === 'Custom')
        .map(item => ({
          id: item.id,
          name: item.content?.metadata?.name || 'Unnamed NFT',
          image: item.content?.links?.image || item.content?.files?.[0]?.uri,
          collection: item.grouping?.[0]?.group_value || 'Independent'
        }));

      const totalValueUSD = tokens.reduce((sum, t) => sum + t.valueUSD, 0);

      setPortfolio({
        solBalance,
        tokens: tokens.sort((a, b) => b.valueUSD - a.valueUSD),
        nfts,
        totalValueUSD,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Elite Portfolio Sync Error:', error);
      setPortfolio((p) => ({
        ...p,
        loading: false,
        error: 'Failed to sync on-chain assets.',
      }));
    }
  }, [publicKey, connected, connection]);

  useEffect(() => {
    fetchPortfolio();
    const interval = setInterval(fetchPortfolio, 60000);
    return () => clearInterval(interval);
  }, [fetchPortfolio]);

  return { ...portfolio, refresh: fetchPortfolio };
}
