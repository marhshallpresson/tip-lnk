import React, { createContext, useContext, useMemo, useEffect, useState } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { Connection, PublicKey } from '@solana/web3.js';
import { QUICKNODE_SOLANA_RPC } from '../config';

const WalletContext = createContext();
const ConnectionContext = createContext();

export function SolanaWalletProvider({ children }) {
  const { primaryWallet, handleLogOut } = useDynamicContext();
  const [connection] = useState(() => new Connection(QUICKNODE_SOLANA_RPC));

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

    return {
      publicKey,
      connected,
      signTransaction,
      signMessage,
      disconnect: handleLogOut,
      wallet: primaryWallet
    };
  }, [primaryWallet, handleLogOut]);

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
