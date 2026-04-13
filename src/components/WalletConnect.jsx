import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Wallet, Shield, Zap } from 'lucide-react';

export default function WalletConnect({ onConnected }) {
  const { connected, publicKey } = useWallet();

  if (connected && publicKey) {
    // Auto-advance after brief delay
    setTimeout(() => onConnected(publicKey.toBase58()), 500);
  }

  return (
    <div className="glass-card glow-brand p-10 max-w-lg mx-auto text-center">
      <div className="w-20 h-20 rounded-2xl bg-brand-600/20 flex items-center justify-center mx-auto mb-6">
        <Wallet size={36} className="text-brand-400" />
      </div>

      <h2 className="text-3xl font-bold mb-3">Connect Your Wallet</h2>
      <p className="text-surface-400 mb-8 leading-relaxed">
        Connect your Solflare wallet to begin your creator onboarding.
        We'll scan your wallet for NFTs and set up your Web3 identity.
      </p>

      <div className="flex justify-center mb-8">
        <WalletMultiButton />
      </div>

      {connected && publicKey && (
        <div className="bg-accent-green/10 border border-accent-green/30 rounded-xl p-4 mt-4">
          <p className="text-accent-green font-medium text-sm">
            Connected: {publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-6)}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mt-8">
        <div className="flex items-center gap-3 text-left">
          <Shield size={18} className="text-brand-400 shrink-0" />
          <span className="text-surface-400 text-sm">Non-custodial access</span>
        </div>
        <div className="flex items-center gap-3 text-left">
          <Zap size={18} className="text-brand-400 shrink-0" />
          <span className="text-surface-400 text-sm">Powered by QuickNode</span>
        </div>
      </div>
    </div>
  );
}
