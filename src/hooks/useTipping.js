import { useState, useCallback, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { VersionedTransaction, PublicKey } from '@solana/web3.js';
import { isValidAddress, toLamports, fromLamports } from '../utils/security';

// ─── Elite Protocol Constants ───
const TREASURY_WALLET = '5yZArHwv64pVrSyDhXvEQtVhweHv7RzeGHhwbMkbgmYp';

/**
 * Professional Tipping Engine (Sender-Pays Fee Standard)
 * Implements real-time routing with a dynamic near-zero platform fee added to the sender.
 */
export function useTipping(creatorAddress) {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();

  const SUPPORTED_TOKENS = [
    { symbol: 'USDC', name: 'USD Coin', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6 },
    { symbol: 'SOL', name: 'Solana', mint: 'So11111111111111111111111111111111111111112', decimals: 9 },
    { symbol: 'BONK', name: 'Bonk', mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', decimals: 5 },
  ];

  const [selectedToken, setSelectedToken] = useState(SUPPORTED_TOKENS[0]);
  const [amount, setAmount] = useState('');
  const [tipAmountUSDC, setTipAmountUSDC] = useState('0');
  const [feeAmountUSDC, setFeeAmountUSDC] = useState('0');
  const [totalChargedUSDC, setTotalChargedUSDC] = useState('0');
  const [processing, setProcessing] = useState(false);
  const [route, setRoute] = useState(null);
  const [txResult, setTxResult] = useState(null);
  const [error, setError] = useState(null);

  // ─── Real-time Price Fetching (Jupiter Price V3 Standard) ───
  const fetchPrice = useCallback(async (symbol) => {
    try {
      const token = SUPPORTED_TOKENS.find(t => t.symbol === symbol);
      if (!token) return 1;

      const response = await fetch(`https://price.jup.ag/v6/price?ids=${token.mint}`);
      const data = await response.json();
      return data.data[token.mint]?.price || 1;
    } catch (err) {
      console.error('Price API Failure:', err);
      return 1;
    }
  }, []);

  const calculateRoute = useCallback(
    async (tokenSymbol, tokenAmount) => {
      if (!tokenAmount || isNaN(parseFloat(tokenAmount)) || parseFloat(tokenAmount) <= 0) {
        setRoute(null);
        setTipAmountUSDC('0');
        setFeeAmountUSDC('0');
        setTotalChargedUSDC('0');
        return;
      }

      setError(null);

      try {
        const token = SUPPORTED_TOKENS.find((t) => t.symbol === tokenSymbol);
        const amountInLamports = toLamports(tokenAmount, token.decimals);

        const isProd = import.meta.env.PROD;
        const API_BASE_URL = isProd ? window.location.origin : (import.meta.env.VITE_API_BASE_URL);
        const params = new URLSearchParams({
          inputMint: token.mint,
          outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
          amount: amountInLamports.toString(),
          slippageBps: '50',
          userPublicKey: publicKey?.toBase58() || '',
        });

        // Use our Professional Backend Proxy to avoid CORS
        const response = await fetch(`${API_BASE_URL}/api/solana/dflow/quote?${params}`);
        if (!response.ok) throw new Error('Professional routing engine failed');

        const order = await response.json();

        // ─── Phase 2: Dynamic Sender-Pays Fee Calculation ───
        const baseOutAmount = BigInt(order.outAmount);
        // 0% on direct stablecoin/sol donations, 1% on complex routes to cover infrastructure
        const dynamicFeeBps = (tokenSymbol === 'USDC' || tokenSymbol === 'SOL') ? 0n : 100n;
        const platformFee = (baseOutAmount * dynamicFeeBps) / 10000n;
        const totalAuthorization = baseOutAmount + platformFee;

        setTipAmountUSDC(fromLamports(baseOutAmount, 6));
        setFeeAmountUSDC(fromLamports(platformFee, 6));
        setTotalChargedUSDC(fromLamports(totalAuthorization, 6));

        setRoute({
          ...order,
          baseAmount: baseOutAmount.toString(),
          feeAmount: platformFee.toString(),
          totalAmount: totalAuthorization.toString(),
          estimatedTime: order.executionMode === 'async' ? '~15s (Jito Optimized)' : '~4s (Helius Fast)'
        });
      } catch (err) {
        console.error('Routing Engine Error:', err);
        setError('Routing engine unavailable. Please try again.');
      }
    },
    [publicKey, creatorAddress]
  );

  const executeTip = useCallback(
    async (senderName) => {
      if (!route || !publicKey || !signTransaction || !connection) {
        setError('Missing transaction data or wallet connection.');
        return;
      }
      setProcessing(true);
      setError(null);

      try {
        const isProd = import.meta.env.PROD;
        const API_BASE_URL = isProd ? window.location.origin : (import.meta.env.VITE_API_BASE_URL);

        let signature;
        if (route.transaction) {
          // ─── Elite Multi-Instruction Processing ───
          const tx = VersionedTransaction.deserialize(Buffer.from(route.transaction, 'base64'));
          const signedTx = await signTransaction(tx);

          // Use our Professional Backend Sender Relay
          const submitRes = await fetch(`${API_BASE_URL}/api/solana/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transaction: Buffer.from(signedTx.serialize()).toString('base64')
            }),
          });

          const submitData = await submitRes.json();
          signature = submitData.result;

          if (!signature) {
            throw new Error(submitData.error?.message || 'Transaction submission failed.');
          }

          // Wait for confirmation
          const latestBlockhash = await connection.getLatestBlockhash();
          await connection.confirmTransaction({
            signature,
            ...latestBlockhash
          }, 'confirmed');
        }

        const result = {
          success: true,
          signature,
          executionMode: route.executionMode,
          outAmount: parseFloat(fromLamports(BigInt(route.baseAmount), 6)),
          feeAmount: parseFloat(fromLamports(BigInt(route.feeAmount), 6)),
          totalCharged: parseFloat(fromLamports(BigInt(route.totalAmount), 6)),
          timestamp: Date.now(),
          sender: senderName || 'Anonymous',
          recipientAddress: creatorAddress,
          treasuryAddress: TREASURY_WALLET
        };

        setTxResult(result);
        return result;
      } catch (err) {
        console.error('Tipping Engine Fault:', err);
        setError(err.message || 'Transaction failed. Check wallet.');
      } finally {
        setProcessing(false);
      }
    },
    [route, publicKey, signTransaction, creatorAddress, connection]
  );

  const reset = useCallback(() => {
    setAmount('');
    setTipAmountUSDC('0');
    setFeeAmountUSDC('0');
    setTotalChargedUSDC('0');
    setRoute(null);
    setTxResult(null);
    setError(null);
  }, []);

  return {
    tokens: SUPPORTED_TOKENS,
    selectedToken,
    setSelectedToken,
    amount,
    setAmount,
    tipAmountUSDC,
    feeAmountUSDC,
    totalAuthorizedUSDC: totalChargedUSDC,
    calculateRoute,
    route,
    processing,
    executeTip,
    txResult,
    reset,
    error,
  };
}
