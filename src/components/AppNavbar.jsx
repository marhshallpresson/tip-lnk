import { useState, useEffect } from 'react';
import { Zap, ArrowRight, User, LayoutDashboard, LogOut } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useApp } from '../contexts/AppContext';
import WalletDropdown from './WalletDropdown';

export default function AppNavbar({
  onGetStarted,
  onboardingComplete,
  connected,
  onViewDashboard,
  onViewProfile,
  isDashboard = false
}) {
  const [scrolled, setScrolled] = useState(false);
  const { publicKey, disconnect } = useWallet();
  const { resetOnboarding } = useApp();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => {
    disconnect();
    resetOnboarding();
  };

  const address = publicKey?.toBase58() || '';
  const shortAddress = `${address.slice(0, 4)}...${address.slice(-4)}`;

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* Top Utility Bar (User Section) */}


      {/* Main Navigation Bar */}
      <nav className={`transition-all duration-300 ${scrolled || isDashboard
          ? 'bg-[#0d1117]/90 backdrop-blur-lg border-b border-[#00d265]/20'
          : 'bg-transparent'
        }`}>
        <div className="max-w-[1300px] mx-auto flex items-center justify-between px-3 sm:px-2 py-3">
          <div className="flex items-center gap-2 cursor-pointer" onClick={onViewProfile}>

            <img src="public/favicon.svg" className="w-8 h-8 " alt="Tip Lnk" />
            <span className="text-2xl font-black tracking-tight text-white">TipLnk</span>
          </div>

          <div className="hidden md:flex items-center gap-9 font-medium">
            {!isDashboard ? (
              <>
                <a href="#features" className="text-sm text-surface-400 hover:text-brand-400 transition-colors">Features</a>
                <a href="#compare" className="text-sm text-surface-400 hover:text-brand-400 transition-colors">Compare</a>
                {onboardingComplete && (
                  <button
                    onClick={onViewDashboard}
                    className="flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 font-bold transition-all"
                  >
                    Dashboard
                  </button>
                )}
              </>
            ) : (
              <>

              </>
            )}
          </div>

            {!connected && (
              <div className="flex items-center gap-2">
                <button
                  onClick={onGetStarted}
                  className="btn-secondary text-sm !px-5 hidden sm:block"
                >
                  Log In
                </button>
                <button
                  onClick={onGetStarted}
                  className="btn-primary text-sm !px-5 flex items-center gap-2"
                >
                  Start Earning <ArrowRight size={16} />
                </button>
              </div>
            )}
          {connected && (
            <WalletDropdown />
          )}
        </div>
      </nav>
    </div>
  );
}
