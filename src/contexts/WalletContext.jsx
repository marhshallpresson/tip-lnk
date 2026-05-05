import React, { createContext, useContext, useMemo, useEffect, useState, useCallback } from 'react';
import { ConnectionProvider, WalletProvider, useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { 
  PhantomWalletAdapter, 
  SolflareWalletAdapter 
} from '@solana/wallet-adapter-wallets';
import { SolanaMobileWalletAdapter, createDefaultAddressSelector, createDefaultAuthorizationResultCache, createDefaultWalletNotFoundHandler } from '@solana-mobile/wallet-adapter-mobile';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
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
  }), [
    publicKey, connected, signTransaction, signMessage, sendTransaction, disconnect, wallet, connect, select, wallets,
    solBalance, usdcBalance, getBalance, executeSwap, swapSolToUsdc, swapUsdcToSol
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
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
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
