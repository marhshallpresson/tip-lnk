import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Wallet, Shield, Zap, Smartphone, Eye, ArrowRight, CheckCircle } from 'lucide-react';
import { useApp } from '../contexts/AppContext';


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
  const [view, setView] = useState('wallets'); // wallets, email
  const [advancing, setAdvancing] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState(null);

  useEffect(() => {
    if (connected && publicKey && !advancing) {
      setAdvancing(true);
      const timer = setTimeout(() => onConnected(publicKey.toBase58()), 800);
      return () => clearTimeout(timer);
    }
  }, [connected, publicKey, onConnected, advancing]);

  const handleSocialSelect = (provider) => {
    setLoadingProvider(provider);
    // Simulate managed wallet creation / oauth flow
    setTimeout(() => {
      const mockAddress = 'HN7cABqLq46Es1jh92dQQisG62sr6pD8HCHLSRsfK34Z';
      onConnected(mockAddress);
      setLoadingProvider(null);
    }, 2000);
  };

  const isSolflareWallet = wallet?.adapter?.name?.toLowerCase().includes('solflare');

  if (view === 'email') {
    return (
      <div className="glass-card glow-brand p-8 sm:p-10 text-center animate-slide-up relative overflow-hidden">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => setView('wallets')}
            className="p-2 rounded-xl bg-surface-900 border border-surface-800 text-surface-400 hover:text-white transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-right">
             <HelpCircle size={20} className="text-surface-600 cursor-help" />
          </div>
        </div>

        <h2 className="text-3xl font-black mb-2">Select Your Email</h2>
        <p className="text-surface-500 text-sm mb-10">Add a wallet with your Apple or Google account</p>

        <div className="space-y-4">
          {/* Apple ID */}
          <button 
            onClick={() => handleSocialSelect('apple')}
            disabled={loadingProvider !== null}
            className="w-full flex items-center gap-4 p-5 rounded-[24px] bg-surface-900 border border-surface-800 hover:border-surface-600 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shrink-0">
               <Apple size={24} className="text-black fill-black" />
            </div>
            <div className="text-left">
              <p className="font-bold text-lg text-white">Apple</p>
              <p className="text-xs text-surface-500">Create wallet with your Apple ID</p>
            </div>
            {loadingProvider === 'apple' && <Loader2 size={18} className="ml-auto animate-spin text-brand-500" />}
          </button>

          {/* Google Account */}
          <button 
            onClick={() => handleSocialSelect('google')}
            disabled={loadingProvider !== null}
            className="w-full flex items-center gap-4 p-5 rounded-[24px] bg-surface-900 border border-surface-800 hover:border-surface-600 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shrink-0">
               <svg width="24" height="24" viewBox="0 0 24 24" className="fill-current">
                 <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                 <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                 <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                 <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
               </svg>
            </div>
            <div className="text-left">
              <p className="font-bold text-lg text-white">
                {loadingProvider === 'google' ? 'Logging in...' : 'Google'}
              </p>
              <p className="text-xs text-surface-500">Create wallet with your Google email</p>
            </div>
            {loadingProvider === 'google' && <Loader2 size={18} className="ml-auto animate-spin text-brand-500" />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card glow-brand p-8 sm:p-10 text-center animate-slide-up relative overflow-hidden">
      {/* Icon */}
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-600/30 to-brand-800/20 flex items-center justify-center mx-auto mb-6">
        <Wallet size={36} className="text-brand-400" />
      </div>

      <h2 className="text-3xl font-bold mb-3">Connect Your Wallet</h2>
      <p className="text-surface-500 text-sm mb-8">Choose your preferred connection method</p>

      {/* Wallet Button */}
      <div className="flex justify-center mb-10">
        <WalletMultiButton />
      </div>

      <div className="space-y-4">
        <button 
          onClick={() => setView('email')}
          className="w-full btn-secondary flex items-center justify-center gap-3 py-4 border-surface-800 hover:border-brand-500 group"
        >
          <Smartphone size={18} className="text-surface-500 group-hover:text-brand-500" />
          Connect with Email
        </button>

        
      </div>

      {/* In-app browser detection badge */}
      {isSolflare && (
        <div className="badge-solflare text-xs mt-6 justify-center">
          Solflare Detected
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
    </div>
  );
}
