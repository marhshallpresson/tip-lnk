import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Wallet, Shield, Zap, Smartphone, Eye, ArrowRight, CheckCircle } from 'lucide-react';

/* Detect Solflare in-app browser */
function useIsSolflare() {
  const [isSolflare, setIsSolflare] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent || '';
    setIsSolflare(ua.toLowerCase().includes('solflare') || !!window.solflare);
  }, []);
  return isSolflare;
}

export default function WalletConnect({ onConnected }) {
  const { update } = useApp();
  const { connected, publicKey, wallet } = useWallet();
  const isSolflare = useIsSolflare();
  const [advancing, setAdvancing] = useState(false);

  const handleDemo = () => {
    update({ isDemo: true });
    onConnected('DEMO_WALLET_ADDRESS');
  };


  useEffect(() => {
    if (connected && publicKey && !advancing) {
      setAdvancing(true);
      const timer = setTimeout(() => onConnected(publicKey.toBase58()), 800);
      return () => clearTimeout(timer);
    }
  }, [connected, publicKey, onConnected, advancing]);

  const isSolflareWallet = wallet?.adapter?.name?.toLowerCase().includes('solflare');

  return (
    <div className="glass-card glow-brand p-8 sm:p-10 max-w-lg mx-auto text-center animate-slide-up">
      {/* Icon */}
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-600/30 to-brand-800/20 flex items-center justify-center mx-auto mb-6">
        <Wallet size={36} className="text-brand-400" />
      </div>

      <h2 className="text-3xl font-bold mb-3">Connect Your Wallet</h2>
      <p className="text-surface-400 mb-8 leading-relaxed">
        Start with <span className="text-solflare font-semibold">Solflare</span> for the full TipLnk experience — portfolio analytics, transaction simulation, and deep linking.
      </p>

      {/* Wallet Button */}
      <div className="flex justify-center mb-6">
        <WalletMultiButton />
      </div>

      {/* Solflare recommendation */}
      {!connected && (
        <div className="bg-solflare/5 border border-solflare/20 rounded-xl p-4 mb-6 text-left">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-md bg-solflare/20 flex items-center justify-center">
              <Smartphone size={12} className="text-solflare" />
            </div>
            <span className="text-sm font-semibold text-solflare">Recommended: Solflare Wallet</span>
          </div>
          <p className="text-xs text-surface-400 leading-relaxed">
            Solflare enables transaction simulation, portfolio analytics, and deep linking on mobile. 
            Other Solana wallets are also supported.
          </p>
          <a
            href="https://solflare.com/download"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-solflare hover:text-solflare-light mt-2 transition-colors"
          >
            Download Solflare <ArrowRight size={10} />
          </a>
        </div>
      )}

      {/* In-app browser detection badge */}
      {isSolflare && (
        <div className="badge-solflare text-xs mb-6 justify-center">
          <Smartphone size={10} /> Solflare In-App Browser Detected
        </div>
      )}

      {/* Connected state */}
      {connected && publicKey && (
        <div className="bg-accent-green/10 border border-accent-green/30 rounded-xl p-4 animate-scale-in">
          <div className="flex items-center justify-center gap-2">
            <CheckCircle size={16} className="text-accent-green" />
            <p className="text-accent-green font-medium text-sm">
              Connected: {publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-6)}
            </p>
          </div>
          {isSolflareWallet && (
            <span className="badge-solflare text-xs mt-2 inline-flex">Solflare ✓</span>
          )}
        </div>
      )}

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 mb-6">
        <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-surface-900/40">
          <Shield size={16} className="text-brand-400" />
          <span className="text-surface-400 text-xs">Non-custodial</span>
        </div>
        <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-surface-900/40">
          <Eye size={16} className="text-brand-400" />
          <span className="text-surface-400 text-xs">TX Simulation</span>
        </div>
        <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-surface-900/40">
          <Zap size={16} className="text-brand-400" />
          <span className="text-surface-400 text-xs">QuickNode RPC</span>
        </div>
      </div>

      <button 
        onClick={handleDemo}
        className="text-surface-500 hover:text-[#c4ff00] text-sm transition-colors flex items-center gap-1 mx-auto"
      >
        <ArrowRight size={14} /> Skip for Preview (Demo Mode)
      </button>
    </div>

  );
}
