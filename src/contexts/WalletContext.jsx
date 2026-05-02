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
const USDC_MINT = new PublicKey('EPjFWaLb3odccjf2cj6ipjAutoMTQ5c6UnNvpy3ZB93A');

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

      // Get USDC balance
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
        mint: USDC_MINT,
      });
      
      if (tokenAccounts.value.length > 0) {
        const tokenAccount = tokenAccounts.value[0];
        const accountInfo = tokenAccount.account.data.parsed.info.tokenAmount;
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

  // Jupiter swap function
  const executeSwap = useCallback(async (inputMint, outputMint, amount, slippage = 0.5) => {
    if (!publicKey || !signTransaction) throw new Error('Wallet not connected or does not support signing');
    
    try {
      // Get quote from Jupiter
      const quoteResponse = await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint.toString()}&outputMint=${outputMint.toString()}&amount=${Math.floor(amount * (inputMint.equals(USDC_MINT) ? 1e6 : LAMPORTS_PER_SOL))}&slippageBps=${slippage * 100}`
      );
      const quote = await quoteResponse.json();

      // Get swap instructions
      const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: publicKey.toString(),
          wrapAndUnwrapSol: true,
        }),
      });
      const swapData = await swapResponse.json();

      // Deserialize and sign the transaction
      const swapTransaction = Buffer.from(swapData.swapTransaction, 'base64');
      const transaction = await connection.parseTransaction(swapTransaction);
      
      const signedTx = await signTransaction(transaction);
      const txHash = await connection.sendRawTransaction(signedTx.serialize());
      
      await connection.confirmTransaction(txHash);
      return txHash;
    } catch (e) {
      console.error('Swap failed:', e);
      throw e;
    }
  }, [publicKey, signTransaction, connection]);

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
            name: 'TipLnk',
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
