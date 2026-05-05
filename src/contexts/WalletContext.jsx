import React, { createContext, useContext, useMemo, useEffect, useState, useCallback } from 'react';
import { ConnectionProvider, WalletProvider, useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';

import { SolanaMobileWalletAdapter, createDefaultAddressSelector, createDefaultAuthorizationResultCache, createDefaultWalletNotFoundHandler } from '@solana-mobile/wallet-adapter-mobile';
import { Connection, PublicKey, LAMPORTS_PER_SOL, VersionedTransaction } from '@solana/web3.js';
import { phantomSdk } from '../lib/phantom';
import bs58 from 'bs58';
import api from '../lib/api';

import { getAccount } from '@solana/spl-token';
import { QUICKNODE_SOLANA_RPC } from '../config';

// USDC token on Solana
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

const WalletContext = createContext();
const ConnectionContext = createContext();

function WalletProviderInner({ children }) {
  const { publicKey, connected, signTransaction, signMessage, sendTransaction, disconnect, wallet, connect, select, wallets } = useSolanaWallet();
  const [connection] = useState(() => new Connection(QUICKNODE_SOLANA_RPC));
  const [solBalance, setSolBalance] = useState(0);
  const [usdcBalance, setUsdcBalance] = useState(0);
  const [isLinking, setIsLinking] = useState(false);

  const getBalance = useCallback(async () => {
    if (!publicKey) return { sol: 0, usdc: 0 };
    
    try {
      // Get SOL balance
      const solBalanceVal = await connection.getBalance(publicKey);
      setSolBalance(solBalanceVal / LAMPORTS_PER_SOL);

      // Get USDC balance - Fetch all and filter for maximum RPC compatibility
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
        programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
      });
      
      const usdcAccount = tokenAccounts.value.find(
        (acc) => acc.account.data.parsed.info.mint === USDC_MINT.toBase58()
      );

      if (usdcAccount) {
        const accountInfo = usdcAccount.account.data.parsed.info.tokenAmount;
        setUsdcBalance(Number(accountInfo.uiAmount));
      } else {
        setUsdcBalance(0);
      }

      return { sol: solBalanceVal / LAMPORTS_PER_SOL, usdc: usdcBalance };
    } catch (e) {
      console.error('Failed to fetch balances:', e);
      return { sol: 0, usdc: 0 };
    }
  }, [publicKey, connection]);

  // Fetch balances on mount and when wallet changes
  useEffect(() => {
    if (connected) {
      getBalance();
    }
  }, [connected, publicKey, getBalance]);

  const performSiwsLogin = useCallback(async (addr, signature, message) => {
    try {
      const res = await api.post('/auth/wallet-login', { 
        walletAddress: addr, 
        signature, 
        message 
      });
      return res;
    } catch (err) {
      console.error('SIWS Error:', err);
      throw err;
    }
  }, []);

  // Global Phantom SDK listeners
  useEffect(() => {
    if (!import.meta.env.VITE_PHANTOM_APP_ID) {
      console.warn('VITE_PHANTOM_APP_ID is missing. Phantom Google login will be disabled.');
      return;
    }

    const handleConnect = async (connectEvent) => {
      if (connectEvent.publicKey && !isLinking) {
        setIsLinking(true);
        const addr = connectEvent.publicKey.toBase58();
        console.log('🛡️ Phantom SDK Connected:', addr);
        
        try {
          // Check if we need to perform SIWS
          // In the future, this can auto-trigger the SIWS flow if the user isn't logged in
        } catch (err) {
          console.error('❌ Phantom SDK Auto-Login Error:', err);
        } finally {
          setIsLinking(false);
        }
      }
    };

    phantomSdk.on('connect', handleConnect);
    
    // Check if already connected on mount (handles redirect resumption)
    if (phantomSdk.isConnected && phantomSdk.publicKey) {
        handleConnect({ publicKey: phantomSdk.publicKey });
    }

    return () => phantomSdk.off('connect', handleConnect);
  }, [isLinking]);

  // Security-hardened Jupiter swap function
  const executeSwap = useCallback(async (inputMint, outputMint, amount, slippage = 0.5) => {
    if (!publicKey || !signTransaction) throw new Error('Wallet not connected or does not support signing');
    
    try {
      const isProd = import.meta.env.PROD;
      const API_BASE_URL = isProd ? window.location.origin : (import.meta.env.VITE_API_BASE_URL);

      const response = await fetch(`${API_BASE_URL}/api/solana/jupiter/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputMint: inputMint.toString(),
          outputMint: outputMint.toString(),
          amount: Math.floor(amount * (inputMint.equals(USDC_MINT) ? 1e6 : LAMPORTS_PER_SOL)).toString(),
          userPublicKey: publicKey.toString(),
          destinationWallet: publicKey.toString(),
          slippageBps: slippage * 100,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Swap preparation failed');
      }

      const { transaction: txBase64 } = await response.json();

      // Deserialize and sign the transaction
      const tx = VersionedTransaction.deserialize(Buffer.from(txBase64, 'base64'));
      
      const signedTx = await signTransaction(tx);
      const txHash = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: true,
        maxRetries: 2
      });
      
      await connection.confirmTransaction(txHash, 'confirmed');
      getBalance();
      return txHash;
    } catch (e) {
      console.error('Swap failed:', e);
      throw e;
    }
  }, [publicKey, signTransaction, connection, getBalance]);

  const swapSolToUsdc = useCallback((amount, slippage = 0.5) => 
    executeSwap(new PublicKey('So11111111111111111111111111111111111111112'), USDC_MINT, amount, slippage), [executeSwap]);

  const swapUsdcToSol = useCallback((amount, slippage = 0.5) => 
    executeSwap(USDC_MINT, new PublicKey('So11111111111111111111111111111111111111112'), amount, slippage), [executeSwap]);

  const walletState = useMemo(() => ({
    publicKey,
    connected,
    signTransaction,
    signMessage,
    sendTransaction,
    disconnect,
    wallet,
    connect,
    select,
    wallets,
    // Token balances
    solBalance,
    usdcBalance,
    getBalance,
    // Jupiter swaps
    executeSwap,
    swapSolToUsdc,
    swapUsdcToSol,
    // SIWS
    performSiwsLogin
  }), [
    publicKey, connected, signTransaction, signMessage, sendTransaction, disconnect, wallet, connect, select, wallets,
    solBalance, usdcBalance, getBalance, executeSwap, swapSolToUsdc, swapUsdcToSol, performSiwsLogin
  ]);

  return (
    <ConnectionContext.Provider value={{ connection }}>
      <WalletContext.Provider value={walletState}>
        {children}
      </WalletContext.Provider>
    </ConnectionContext.Provider>
  );
}

export function SolanaWalletProvider({ children }) {
  const endpoint = QUICKNODE_SOLANA_RPC;

  const wallets = useMemo(() => [
    new SolanaMobileWalletAdapter({
        addressSelector: createDefaultAddressSelector(),
        appIdentity: {
            name: 'Tip Stack',
            uri: window.location.origin,
            icon: '/favicon.svg',
        },
        authorizationResultCache: createDefaultAuthorizationResultCache(),
        cluster: 'mainnet-beta',
        onWalletNotFound: createDefaultWalletNotFoundHandler(),
    }),
  ], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletProviderInner>
            {children}
          </WalletProviderInner>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a SolanaWalletProvider');
  }
  return context;
}

export function useConnection() {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnection must be used within a SolanaWalletProvider');
  }
  return context;
}
