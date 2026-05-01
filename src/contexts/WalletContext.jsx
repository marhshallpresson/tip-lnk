import React, { createContext, useContext, useMemo, useEffect, useState } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAccount, getMint } from '@solana/spl-token';
import { QUICKNODE_SOLANA_RPC } from '../config';

// USDC token on Solana (devnet: EPjFWaLb3odccjf2cj6ipjAutoMTQ5c6UnNvpy3ZB93A)
const USDC_MINT = new PublicKey('EPjFWaLb3odccjf2cj6ipjAutoMTQ5c6UnNvpy3ZB93A');

const WalletContext = createContext();
const ConnectionContext = createContext();

export function SolanaWalletProvider({ children }) {
  const { primaryWallet, handleLogOut } = useDynamicContext();
  const [connection] = useState(() => new Connection(QUICKNODE_SOLANA_RPC));
  const [solBalance, setSolBalance] = useState(0);
  const [usdcBalance, setUsdcBalance] = useState(0);

  const walletState = useMemo(() => {
    let publicKey = null;
    let connected = false;

    if (primaryWallet && primaryWallet.chain === 'sol') {
      try {
        publicKey = new PublicKey(primaryWallet.address);
        connected = true;
      } catch (e) {
        console.error('Failed to parse public key from Dynamic wallet');
      }
    }

    const getBalance = async () => {
      if (!publicKey) return { sol: 0, usdc: 0 };
      
      try {
        // Get SOL balance
        const solBalance = await connection.getBalance(publicKey);
        setSolBalance(solBalance / LAMPORTS_PER_SOL);

        // Get USDC balance
        const tokenAccounts = await connection.getTokenAccountsByOwner(publicKey, {
          mint: USDC_MINT,
        });
        
        if (tokenAccounts.value.length > 0) {
          const tokenAccount = tokenAccounts.value[0];
          const accountInfo = await getAccount(connection, tokenAccount.pubkey);
          setUsdcBalance(Number(accountInfo.amount) / 1e6); // USDC has 6 decimals
        } else {
          setUsdcBalance(0);
        }

        return { sol: solBalance / LAMPORTS_PER_SOL, usdc: usdcBalance };
      } catch (e) {
        console.error('Failed to fetch balances:', e);
        return { sol: 0, usdc: 0 };
      }
    };

    const signTransaction = async (transaction) => {
      if (!primaryWallet) throw new Error('Wallet not connected');
      const signer = await primaryWallet.connector.getSigner();
      return await signer.signTransaction(transaction);
    };

    const signMessage = async (message) => {
      if (!primaryWallet) throw new Error('Wallet not connected');
      const signer = await primaryWallet.connector.getSigner();
      return await signer.signMessage(message);
    };

    // Jupiter swap function
    const executeSwap = async (inputMint, outputMint, amount, slippage = 0.5) => {
      if (!publicKey) throw new Error('Wallet not connected');
      
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
    };

    // Convenience methods
    const swapSolToUsdc = (amount, slippage = 0.5) => 
      executeSwap(new PublicKey('So11111111111111111111111111111111111111112'), USDC_MINT, amount, slippage);

    const swapUsdcToSol = (amount, slippage = 0.5) => 
      executeSwap(USDC_MINT, new PublicKey('So11111111111111111111111111111111111111112'), amount, slippage);

    return {
      publicKey,
      connected,
      signTransaction,
      signMessage,
      disconnect: handleLogOut,
      wallet: primaryWallet,
      // Token balances
      solBalance,
      usdcBalance,
      getBalance,
      // Jupiter swaps
      executeSwap,
      swapSolToUsdc,
      swapUsdcToSol,
    };
  }, [primaryWallet, handleLogOut, connection, usdcBalance]);

  // Fetch balances on mount and when wallet changes
  useEffect(() => {
    if (walletState.connected) {
      walletState.getBalance();
    }
  }, [walletState.connected]);

  return (
    <ConnectionContext.Provider value={{ connection }}>
      <WalletContext.Provider value={walletState}>
        {children}
      </WalletContext.Provider>
    </ConnectionContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}

export function useConnection() {
  return useContext(ConnectionContext);
}
