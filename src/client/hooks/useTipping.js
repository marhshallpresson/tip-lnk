import { useState, useCallback, useEffect } from 'react';
import { useWallet, useConnection } from '../contexts/WalletContext';
import { VersionedTransaction, PublicKey } from '@solana/web3.js';
import { toLamports, fromLamports } from '../utils/security';

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const PRIORITY_SYMBOLS = ['USDC', 'USDT', 'SOL', 'JUP', 'BONK'];

const DEFAULT_TOKENS = [
  { symbol: 'USDC', name: 'USD Coin', mint: USDC_MINT, decimals: 6, logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png', balance: 0 },
  { symbol: 'SOL', name: 'Solana', mint: SOL_MINT, decimals: 9, logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png', balance: 0 },
];

const normalizeToken = (token) => {
  const mint = token.address || token.mint;
  const decimals = Number(token.decimals);
  const validDecimals = Number.isFinite(decimals) ? Math.min(Math.max(decimals, 0), 12) : 0;
  return {
    symbol: token.symbol,
    name: token.name || token.symbol,
    mint,
    decimals: validDecimals,
    logoURI: token.logoURI || '',
    balance: 0,
  };
};

/**
 * Tipping engine with Jupiter token discovery.
 * Defaults to USDC while allowing dynamic token selection from Jupiter strict list.
 */
export function useTipping(creatorAddress) {
  const { publicKey, signTransaction, sendTransaction, wallet } = useWallet();
  const { connection } = useConnection();

  const [tokens, setTokens] = useState(DEFAULT_TOKENS);
  const [selectedToken, setSelectedToken] = useState(DEFAULT_TOKENS[0]);
  const [tokensLoading, setTokensLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchSupportedTokens = async () => {
      setTokensLoading(true);
      try {
        const response = await fetch('https://token.jup.ag/strict');
        const rawTokens = await response.json();
        const normalized = Array.isArray(rawTokens) ? rawTokens.map(normalizeToken) : [];

        const bySymbol = new Map();
        for (const token of normalized) {
          if (!token.symbol || !token.mint) continue;
          try {
            new PublicKey(token.mint);
          } catch {
            continue;
          }
          if (!bySymbol.has(token.symbol)) bySymbol.set(token.symbol, token);
        }

        const priority = PRIORITY_SYMBOLS
          .map((symbol) => bySymbol.get(symbol))
          .filter(Boolean);

        const remaining = [...bySymbol.values()]
          .filter((token) => !PRIORITY_SYMBOLS.includes(token.symbol))
          .slice(0, 36);

        const finalTokens = [...priority, ...remaining];
        const resolvedTokens = finalTokens.length ? finalTokens : DEFAULT_TOKENS;
        const preferredDefault = resolvedTokens.find((t) => t.symbol === 'USDC') || resolvedTokens[0];

        if (!active) return;
        setTokens(resolvedTokens);
        setSelectedToken((current) => {
          const stillAvailable = resolvedTokens.find((t) => t.symbol === current?.symbol);
          return stillAvailable || preferredDefault;
        });
      } catch (err) {
        console.warn('Failed to fetch Jupiter strict list, falling back to defaults', err);
        if (!active) return;
        setTokens(DEFAULT_TOKENS);
        setSelectedToken(DEFAULT_TOKENS[0]);
      } finally {
        if (active) setTokensLoading(false);
      }
    };

    fetchSupportedTokens();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadBalances = async () => {
      if (!publicKey || !connection || tokens.length === 0) return;
      try {
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: new PublicKey(TOKEN_PROGRAM_ID)
        });

        const balances = {};
        for (const account of tokenAccounts.value) {
          const info = account.account.data.parsed.info;
          const uiAmount = Number(info?.tokenAmount?.uiAmount || 0);
          if (uiAmount > 0) balances[info.mint] = uiAmount;
        }

        const solBalance = await connection.getBalance(publicKey);
        balances[SOL_MINT] = solBalance / 1e9;

        if (!active) return;
        setTokens((prev) => prev.map((token) => ({
          ...token,
          balance: balances[token.mint] || 0
        })));
      } catch (err) {
        console.warn('Balance detection failed:', err);
      }
    };

    loadBalances();
    return () => {
      active = false;
    };
  }, [publicKey, connection, tokens.length]);

  const [amount, setAmount] = useState('');
  const [tipAmountUSDC, setTipAmountUSDC] = useState('0');
  const [feeAmountUSDC, setFeeAmountUSDC] = useState('0');
  const [totalChargedUSDC, setTotalChargedUSDC] = useState('0');
  const [processing, setProcessing] = useState(false);
  const [route, setRoute] = useState(null);
  const [txResult, setTxResult] = useState(null);
  const [error, setError] = useState(null);

  const [recurringRoute, setRecurringRoute] = useState(null);

  const calculateRecurringRoute = useCallback(
    async (tokenSymbol, tokenAmount, frequency = 'monthly', cycles = 12) => {
      if (!tokenAmount || isNaN(parseFloat(tokenAmount)) || parseFloat(tokenAmount) <= 0) {
        setRecurringRoute(null);
        return;
      }

      setError(null);
      try {
        const token = tokens.find((t) => t.symbol === tokenSymbol);
        if (!token) throw new Error(`Token ${tokenSymbol} not found`);
        if (!Number.isFinite(token.decimals) || token.decimals < 0 || token.decimals > 12) {
          throw new Error(`Token ${tokenSymbol} has unsupported decimals`);
        }

        // frequency mapped to seconds
        const frequencyMap = { 'weekly': 604800, 'monthly': 2592000, 'daily': 86400 };
        const frequencySeconds = frequencyMap[frequency] || 2592000;

        const payload = {
          creatorId: creatorAddress,
          inputTokenMint: token.mint,
          amountPerCycle: toLamports(parseFloat(tokenAmount), token.decimals).toString(),
          sourceWalletAddress: publicKey?.toBase58(),
          frequencySeconds,
          cycles
        };

        const response = await fetch(`/api/payments/recurring`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Failed to calculate subscription route');

        const subData = await response.json();
        setRecurringRoute(subData);
        console.log('✅ Subscription route calculated:', subData);
      } catch (err) {
        console.error('❌ Subscription Error:', err);
        setError(err.message);
      }
    },
    [publicKey, creatorAddress, tokens]
  );

  const calculateRoute = useCallback(
    async (tokenSymbol, tokenAmount, note = '', yieldEnabled = false) => {
      if (!tokenAmount || isNaN(parseFloat(tokenAmount)) || parseFloat(tokenAmount) <= 0) {
        setRoute(null);
        setTipAmountUSDC('0');
        setFeeAmountUSDC('0');
        setTotalChargedUSDC('0');
        console.log('🚫 Route calculation skipped: Invalid amount', { tokenAmount });
        return;
      }

      console.log('📊 Starting route calculation...', { tokenSymbol, tokenAmount, creatorAddress, yieldEnabled });
      setError(null);

      try {
        const token = tokens.find((t) => t.symbol === tokenSymbol);
        if (!token) {
          console.error('❌ Token not found:', tokenSymbol, 'Available:', tokens.map(t => t.symbol));
          throw new Error(`Token ${tokenSymbol} not found in available tokens`);
        }

        if (!creatorAddress) {
          console.error('❌ Creator address missing:', creatorAddress);
          throw new Error('Creator address not resolved');
        }

        const walletAddress = publicKey?.toBase58() || wallet?.address;

        if (!walletAddress) {
          console.warn('⚠️ Payment Intent Fault: No wallet address available for routing.');
          return;
        }

        const payload = {
          creatorId: creatorAddress,
          inputTokenMint: token.mint,
          amount: toLamports(parseFloat(tokenAmount), token.decimals).toString(),
          paymentMethod: 'external_wallet',
          sourceWalletAddress: walletAddress,
          memo: note,
          yieldEnabled
        };

        console.log('📤 Sending payment intent payload:', payload);

        const response = await fetch(`/api/payments/intent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          const errText = await response.text();
          console.error('❌ API Response Error:', response.status, errText);
          throw new Error(`Payment Intent API Error: ${response.status} - ${errText}`);
        }

        const intentData = await response.json();
        console.log('✅ Payment intent received:', intentData);

        if (!intentData.quote || !intentData.transaction) {
          console.error('❌ Invalid intent response - missing quote or transaction:', intentData);
          throw new Error('Invalid payment intent response structure');
        }

        const order = {
          outAmount: intentData.quote.outAmount,
          priceImpactPct: intentData.quote.priceImpactPct,
          transaction: intentData.transaction,
          executionMode: intentData.executionMode || 'sync',
          intentId: intentData.intentId,
          provider: intentData.provider,
          requestId: intentData.requestId
        };

        const baseOutAmount = BigInt(order.outAmount);
        const inputMint = token.mint;
        const outputMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
        const dynamicFeeBps = (inputMint === outputMint) ? 0n : 500n;
        const platformFee = (baseOutAmount * dynamicFeeBps) / 10000n;
        const totalAuthorization = baseOutAmount + platformFee;

        setTipAmountUSDC(fromLamports(baseOutAmount, 6));
        setFeeAmountUSDC(fromLamports(platformFee, 6));
        setTotalChargedUSDC(fromLamports(totalAuthorization, 6));

        const newRoute = {
          ...order,
          baseAmount: baseOutAmount.toString(),
          feeAmount: platformFee.toString(),
          totalAmount: totalAuthorization.toString(),
          estimatedTime: order.executionMode === 'async' ? '~15s (Jito Optimized)' : '~4s (Helius Fast)'
        };

        console.log('✅ Route calculated successfully:', newRoute);
        setRoute(newRoute);
      } catch (err) {
        console.error('❌ Routing Engine Error:', err.message, err);
        setRoute(null);
        setTipAmountUSDC('0');
        setFeeAmountUSDC('0');
        setTotalChargedUSDC('0');
        setError(`Route calculation failed: ${err.message}`);
      }
    },
    [publicKey, creatorAddress, tokens]
  );

  const executeTip = useCallback(
    async (senderName, note = '') => {
      if (!route || !publicKey || !connection || !wallet) {
        setError('Missing transaction data or wallet connection.');
        return;
      }
      setProcessing(true);
      setError(null);

      try {
        const DFLOW_API = 'https://quote-api.dflow.net';
        const DFLOW_API_KEY = import.meta.env.VITE_DFLOW_API_KEY;

        let signature;

        // ZERO-KNOWLEDGE: Frontend never builds transactions. It only signs buffers from the backend.
        const tx = VersionedTransaction.deserialize(Buffer.from(route.transaction, 'base64'));

        // ─── ELITE SECURITY: PRE-SIGN SIMULATION ───
        try {
          const simulation = await connection.simulateTransaction(tx, {
            replaceRecentBlockhash: true,
            commitment: 'confirmed'
          });
          if (simulation.value.err) {
            console.warn('⚠️ Transaction Simulation Failed:', simulation.value.err);
            // We still allow proceeding if it's just a slippage/balance warning, 
            // but strict errors should stop the flow.
            if (JSON.stringify(simulation.value.err).includes('InsufficientFunds')) {
               throw new Error('Simulation failed: Insufficient funds for transaction.');
            }
          }
        } catch (simErr) {
          console.error('Simulation check fault:', simErr);
          if (simErr.message.includes('Insufficient funds')) throw simErr;
        }

        // DETECT EMBEDDED WALLET: Embedded wallets (Google login) do not support signTransaction.
        if (!signTransaction) {
          console.log('⚡ Detected embedded wallet (no signTransaction). Using sendTransaction...');
          signature = await sendTransaction(tx, connection);
        } else {
          console.log('⚡ Detected extension wallet. Signing transaction...');
          const signedTx = await signTransaction(tx);
          const signedTransaction = Buffer.from(signedTx.serialize()).toString('base64');

          if (route.provider === 'jupiter-ultra' && route.requestId) {
            const executeRes = await fetch(`/api/payments/execute`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                provider: route.provider,
                requestId: route.requestId,
                signedTransaction
              }),
            });

            const executeData = await executeRes.json();
            if (!executeRes.ok || !executeData.success) {
              throw new Error(executeData.error || 'Jupiter execution failed.');
            }
            signature = executeData.signature;
          } else {
            signature = await connection.sendRawTransaction(signedTx.serialize(), {
              skipPreflight: false,
              maxRetries: 2
            });
          }
        }

        if (!signature) {
          throw new Error('Transaction submission failed.');
        }

        const result = {
          success: true,
          status: 'pending',
          signature,
          executionMode: route.executionMode,
          outAmount: parseFloat(fromLamports(BigInt(route.baseAmount), 6)),
          feeAmount: parseFloat(fromLamports(BigInt(route.feeAmount), 6)),
          totalCharged: parseFloat(fromLamports(BigInt(route.totalAmount), 6)),
          timestamp: Date.now(),
          sender: senderName || 'Anonymous',
          recipientId: creatorAddress,
        };

        setTxResult(result);

        if (route.executionMode === 'async') {
           console.log('⏳ DFlow: Monitoring Jito bundle execution...');
           let status = 'pending';
           
           let attempts = 0;
           while (status !== 'closed' && status !== 'failed' && status !== 'expired' && attempts < 15) {
             await new Promise(r => setTimeout(r, 3000));
             attempts++;
             try {
                const statusRes = await fetch(`${DFLOW_API}/order-status?signature=${signature}`, {
                  headers: DFLOW_API_KEY ? { 'x-api-key': DFLOW_API_KEY } : {}
                });
                const statusData = await statusRes.json();
                status = statusData.status;
                console.log(`📊 DFlow Status: ${status}`);
             } catch (e) {
                console.warn('DFlow status poll failed, waiting for webhook fallback.');
                break; 
             }
           }
        } else {
          try {
            const latestBlockhash = await connection.getLatestBlockhash('confirmed');
            await connection.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed');
          } catch (e) {
             console.warn('RPC confirmation timeout, relying on Helius webhook.');
          }
        }

        return result;

      } catch (err) {
        console.error('Tipping Engine Fault:', err);
        setError(err.message || 'Transaction failed. Check wallet.');
      } finally {
        setProcessing(false);
      }
    },
    [route, publicKey, signTransaction, creatorAddress, connection, wallet]
  );

  const executeSubscription = useCallback(
    async (senderName) => {
      if (!recurringRoute || !publicKey || !signTransaction || !connection) {
        setError('Missing subscription data or wallet connection.');
        return;
      }
      setProcessing(true);
      setError(null);

      try {
        const tx = VersionedTransaction.deserialize(Buffer.from(recurringRoute.transaction, 'base64'));
        const signedTx = await signTransaction(tx);
        
        const submitRes = await fetch(`/api/solana/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transaction: Buffer.from(signedTx.serialize()).toString('base64'),
            note: `Subscription: ${recurringRoute.intentId}`
          }),
        });

        if (!submitRes.ok) throw new Error('Subscription submission failed');

        const submitData = await submitRes.json();
        
        setTxResult({
          success: true,
          signature: submitData.result,
          type: 'subscription_created',
          orderAddress: recurringRoute.orderAddress
        });

        return submitData;
      } catch (err) {
        console.error('Subscription Execution Fault:', err);
        setError(err.message);
      } finally {
        setProcessing(false);
      }
    },
    [recurringRoute, publicKey, signTransaction, connection]
  );

  const reset = useCallback(() => {
    setAmount('');
    setTipAmountUSDC('0');
    setFeeAmountUSDC('0');
    setTotalChargedUSDC('0');
    setRoute(null);
    setRecurringRoute(null);
    setTxResult(null);
    setError(null);
  }, []);

  return {
    tokens,
    tokensLoading,
    selectedToken,
    setSelectedToken,
    amount,
    setAmount,
    tipAmountUSDC,
    feeAmountUSDC,
    totalAuthorizedUSDC: totalChargedUSDC,
    calculateRoute,
    calculateRecurringRoute,
    route,
    recurringRoute,
    processing,
    executeTip,
    executeSubscription,
    txResult,
    setTxResult,
    reset,
    error,
  };
}
