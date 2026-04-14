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

      // ─── DFlow Trade API Simulation (SendAI Native) ───
      const rawUSDC = tokenAmount * token.price;
      const platformFeeBps = 30; // 0.3% DFlow routing fee
      const fee = rawUSDC * (platformFeeBps / 10000);
      const outAmount = rawUSDC - fee;
      const slippageBps = 50; // 0.5%
      const minOutAmount = outAmount * (1 - slippageBps / 10000);
      const priceImpactPct = tokenAmount > 1000 ? 0.15 : 0.05;

      setTipAmountUSDC(outAmount);
      setRoute({
        inputMint: token.mint,
        outputMint: SUPPORTED_TOKENS.find(t => t.symbol === 'USDC').mint,
        inAmount: tokenAmount,
        outAmount: outAmount,
        minOutAmount: minOutAmount,
        priceImpactPct: priceImpactPct,
        executionMode: outAmount > 100 ? 'async' : 'sync', // DFlow pattern: complex trades use async (Jito)
        prioritizationFeeLamports: 'auto',
        computeUnitLimit: 200000,
        routePlan: [
          {
            swapInfo: {
              label: 'Jupiter',
              inputMint: token.mint,
              outputMint: '...',
              outAmount: outAmount * 0.45,
              feeAmount: fee * 0.45,
              feeMint: '...',
            },
            percent: 45,
          },
          {
            swapInfo: {
              label: 'Orca',
              inputMint: '...',
              outputMint: '...',
              outAmount: outAmount * 0.55,
              feeAmount: fee * 0.55,
              feeMint: '...',
            },
            percent: 55,
          }
        ],
        estimatedTime: outAmount > 100 ? '~25 seconds (Jito Bundle)' : '~6 seconds (Atomic)',
      });
    },
    []
  );

  const executeTip = useCallback(
    async (senderName) => {
      if (!route) return;
      setProcessing(true);
      setTxResult(null);

      // ─── Simulate SendAI DFlow Execution Flow ───
      // If executionMode is 'async', we would poll /order-status
      const simulateDelay = route.executionMode === 'async' ? 5000 : 2500;
      await new Promise((r) => setTimeout(r, simulateDelay));

      const result = {
        success: true,
        signature: `${Math.random().toString(36).slice(2, 10)}...${Math.random().toString(36).slice(2, 10)}`,
        executionMode: route.executionMode,
        outAmount: route.outAmount,
        minOutAmount: route.minOutAmount,
        priceImpact: route.priceImpactPct,
        timestamp: Date.now(),
        sender: senderName || 'Anonymous',
        recipientAddress: creatorAddress,
        fills: route.routePlan.map(p => ({
          venue: p.swapInfo.label,
          amount: p.swapInfo.outAmount
        }))
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
