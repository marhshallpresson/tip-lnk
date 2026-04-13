import { useState, useCallback } from 'react';

const SUPPORTED_TOKENS = [
  { symbol: 'BONK', name: 'Bonk', mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', decimals: 5, price: 0.000023 },
  { symbol: 'WIF', name: 'dogwifhat', mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', decimals: 6, price: 2.34 },
  { symbol: 'JUP', name: 'Jupiter', mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', decimals: 6, price: 0.89 },
  { symbol: 'SOL', name: 'Solana', mint: 'So11111111111111111111111111111111111111112', decimals: 9, price: 178.50 },
  { symbol: 'USDC', name: 'USD Coin', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6, price: 1.00 },
];

const DEX_ROUTES = [
  { name: 'Jupiter', share: 45 },
  { name: 'Raydium', share: 30 },
  { name: 'Orca', share: 25 },
];

export function useTipping(creatorAddress) {
  const [selectedToken, setSelectedToken] = useState(SUPPORTED_TOKENS[0]);
  const [amount, setAmount] = useState('');
  const [tipAmountUSDC, setTipAmountUSDC] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [route, setRoute] = useState(null);
  const [txResult, setTxResult] = useState(null);

  const calculateRoute = useCallback(
    (tokenSymbol, tokenAmount) => {
      const token = SUPPORTED_TOKENS.find((t) => t.symbol === tokenSymbol);
      if (!token || !tokenAmount || tokenAmount <= 0) {
        setRoute(null);
        setTipAmountUSDC(0);
        return;
      }

      const rawUSDC = tokenAmount * token.price;
      const fee = rawUSDC * 0.003; // 0.3% DFlow routing fee
      const netUSDC = rawUSDC - fee;
      const priceImpact = tokenAmount > 1000 ? 0.15 : 0.05;

      setTipAmountUSDC(netUSDC);
      setRoute({
        inputToken: token.symbol,
        inputAmount: tokenAmount,
        outputToken: 'USDC',
        outputAmount: netUSDC,
        fee,
        priceImpact,
        dexSplit: DEX_ROUTES.map((d) => ({
          ...d,
          amount: (netUSDC * d.share) / 100,
        })),
        estimatedTime: '~12 seconds',
      });
    },
    []
  );

  const executeTip = useCallback(
    async (senderName) => {
      if (!route) return;
      setProcessing(true);
      setTxResult(null);

      // Simulate DFlow intent-based routing + DEX aggregation
      await new Promise((r) => setTimeout(r, 3000));

      const result = {
        success: true,
        txSignature: `${Math.random().toString(36).slice(2, 10)}...${Math.random().toString(36).slice(2, 10)}`,
        inputToken: route.inputToken,
        inputAmount: route.inputAmount,
        outputAmount: route.outputAmount,
        fee: route.fee,
        timestamp: Date.now(),
        sender: senderName || 'Anonymous',
        recipient: creatorAddress,
      };

      setTxResult(result);
      setProcessing(false);
      return result;
    },
    [route, creatorAddress]
  );

  const reset = useCallback(() => {
    setAmount('');
    setTipAmountUSDC(0);
    setRoute(null);
    setTxResult(null);
  }, []);

  return {
    tokens: SUPPORTED_TOKENS,
    selectedToken,
    setSelectedToken,
    amount,
    setAmount,
    tipAmountUSDC,
    calculateRoute,
    route,
    processing,
    executeTip,
    txResult,
    reset,
  };
}
