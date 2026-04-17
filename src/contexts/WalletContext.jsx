import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { 
  SolflareWalletAdapter, 
  PhantomWalletAdapter 
} from '@solana/wallet-adapter-wallets';
import { SolanaMobileWalletAdapter, createDefaultAddressSelector, createDefaultAuthorizationResultCache, createDefaultWalletNotFoundHandler } from '@solana-mobile/wallet-adapter-mobile';
import { QUICKNODE_SOLANA_RPC } from '../config';

export function SolanaWalletProvider({ children }) {
  const endpoint = QUICKNODE_SOLANA_RPC;

  const wallets = useMemo(() => [
    // ─── Elite Mobile Detection ───
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
    new SolflareWalletAdapter(),
    new PhantomWalletAdapter(),
  ], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
