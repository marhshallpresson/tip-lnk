import { useState, useCallback, useEffect } from 'react';
import { useWallet, useConnection } from '../contexts/WalletContext';
import { VersionedTransaction, PublicKey } from '@solana/web3.js';
import { isValidAddress, toLamports, fromLamports } from '../utils/security';

const TREASURY_WALLET = import.meta.env.VITE_TREASURY_WALLET ;

import { getTiplnkProgram, getSendTokenAccounts } from '../lib/anchor';

/**
 * Professional Tipping Engine (Sender-Pays Fee Standard)
 * Implements real-time routing with a dynamic near-zero platform fee added to the sender.
 * Elite Upgrade: Anchor On-chain Integration & DFlow Elite Routing.
 */
export function useTipping(creatorAddress) {
  const { publicKey, signTransaction, wallet: dynamicWallet } = useWallet();
  const { connection } = useConnection();

  const DEFAULT_TOKENS = [
    { symbol: 'USDC', name: 'USD Coin', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6, logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png' },
    { symbol: 'SOL', name: 'Solana', mint: 'So11111111111111111111111111111111111111112', decimals: 9, logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png' },
    { symbol: 'BONK', name: 'Bonk', mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', decimals: 5, logoURI: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I' },
  ];

  const [tokens, setTokens] = useState(DEFAULT_TOKENS);
  const [selectedToken, setSelectedToken] = useState(DEFAULT_TOKENS[0]);

  useEffect(() => {
    const detectBalances = async () => {
        if (!publicKey || !connection) return;
        try {
            let jupTokens = [];
            try {
              const res = await fetch('https://tokens.jup.ag/tokens?tags=strict');
              jupTokens = await res.json();
            } catch (err) {
              console.warn('Failed to fetch Jupiter strict list, falling back to defaults', err);
              jupTokens = DEFAULT_TOKENS;
            }

            const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
                programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
            });

            const balances = {};
            tokenAccounts.value.forEach(acc => {
                const info = acc.account.data.parsed.info;
                if (info.tokenAmount.uiAmount > 0) {
                  balances[info.mint] = info.tokenAmount.uiAmount;
                }
            });

            const solBalance = await connection.getBalance(publicKey);
            balances['So11111111111111111111111111111111111111112'] = solBalance / 1e9;

            const dynamicTokens = [];
            
            if (balances['So11111111111111111111111111111111111111112'] > 0) {
              const solData = jupTokens.find(t => t.address === 'So11111111111111111111111111111111111111112') || DEFAULT_TOKENS[1];
              dynamicTokens.push({
                symbol: solData.symbol,
                name: solData.name,
                mint: 'So11111111111111111111111111111111111111112',
                decimals: solData.decimals,
                logoURI: solData.logoURI,
                balance: balances['So11111111111111111111111111111111111111112']
              });
            }

            Object.entries(balances).forEach(([mint, balance]) => {
               if (mint === 'So11111111111111111111111111111111111111112') return;
               const tokenData = jupTokens.find(t => t.address === mint);
               if (tokenData) {
                  dynamicTokens.push({
                    symbol: tokenData.symbol,
                    name: tokenData.name,
                    mint: mint,
                    decimals: tokenData.decimals,
                    logoURI: tokenData.logoURI,
                    balance: balance
                  });
               }
            });

            dynamicTokens.sort((a, b) => (b.balance || 0) - (a.balance || 0));

            const finalTokens = dynamicTokens.length > 0 ? dynamicTokens : DEFAULT_TOKENS;

            setTokens(finalTokens);
            setSelectedToken(finalTokens[0]);
            
        } catch (e) {
            console.warn('Balance detection failed:', e);
            setTokens(DEFAULT_TOKENS);
            setSelectedToken(DEFAULT_TOKENS[0]);
        }
    };
    detectBalances();
  }, [publicKey, connection]);

  const [amount, setAmount] = useState('');
  const [tipAmountUSDC, setTipAmountUSDC] = useState('0');
  const [feeAmountUSDC, setFeeAmountUSDC] = useState('0');
  const [totalChargedUSDC, setTotalChargedUSDC] = useState('0');
  const [processing, setProcessing] = useState(false);
  const [route, setRoute] = useState(null);
  const [txResult, setTxResult] = useState(null);
  const [error, setError] = useState(null);

  const fetchPrice = useCallback(async (symbol) => {
    try {
      const token = tokens.find(t => t.symbol === symbol);
      if (!token) return 1;

      const response = await fetch(`https://price.jup.ag/v6/price?ids=${token.mint}`);
      const data = await response.json();
      return data.data[token.mint]?.price || 1;
    } catch (err) {
      console.error('Price API Failure:', err);
      return 1;
    }
  }, [tokens]);

  const calculateRoute = useCallback(
    async (tokenSymbol, tokenAmount, note = '') => {
      if (!tokenAmount || isNaN(parseFloat(tokenAmount)) || parseFloat(tokenAmount) <= 0) {
        setRoute(null);
        setTipAmountUSDC('0');
        setFeeAmountUSDC('0');
        setTotalChargedUSDC('0');
        return;
      }

      setError(null);

      try {
        const token = tokens.find((t) => t.symbol === tokenSymbol);
        if (!token) throw new Error('Token not found');

        const isProd = import.meta.env.PROD;
        const API_BASE_URL = isProd ? window.location.origin : (import.meta.env.VITE_API_BASE_URL);
        
        const payload = {
          creatorId,
          inputTokenMint: token.mint,
          amount: tokenAmount.toString(),
          paymentMethod: 'external_wallet',
          sourceWalletAddress: publicKey?.toBase58() || '',
          memo: note
        };

        const response = await fetch(`${API_BASE_URL}/api/payments/intent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error('Payment Intent engine failed');

        const intentData = await response.json();
        const order = {
          outAmount: intentData.quote.outAmount,
          transaction: intentData.transaction,
          executionMode: intentData.executionMode,
          intentId: intentData.intentId
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
    [publicKey, creatorId, tokens]
  );

  const executeTip = useCallback(
    async (senderName, note = '') => {
      if (!route || !publicKey || !signTransaction || !connection || !dynamicWallet) {
        setError('Missing transaction data or wallet connection.');
        return;
      }
      setProcessing(true);
      setError(null);

      try {
        const isProd = import.meta.env.PROD;
        const API_BASE_URL = isProd ? window.location.origin : (import.meta.env.VITE_API_BASE_URL);
        const DFLOW_API = 'https://quote-api.dflow.net';
        const DFLOW_API_KEY = import.meta.env.VITE_DFLOW_API_KEY;

        let signature;

        // ZERO-KNOWLEDGE: Frontend never builds transactions. It only signs buffers from the backend.
        const tx = VersionedTransaction.deserialize(Buffer.from(route.transaction, 'base64'));
        const signedTx = await signTransaction(tx);

        const submitRes = await fetch(`${API_BASE_URL}/api/solana/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transaction: Buffer.from(signedTx.serialize()).toString('base64'),
            note: note
          }),
        });

        if (!submitRes.ok) {
           const errData = await submitRes.json();
           throw new Error(errData.error || 'Transaction submission failed.');
        }

        const submitData = await submitRes.json();
        signature = submitData.result;

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
          recipientId: creatorId,
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
    [route, publicKey, signTransaction, creatorAddress, connection, dynamicWallet, selectedToken, amount]
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
    tokens,
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
    setTxResult,
    reset,
    error,
  };
}
