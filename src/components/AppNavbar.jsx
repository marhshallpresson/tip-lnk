import { useState, useEffect } from 'react';
import { Zap, ArrowRight, User, LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <nav className={`transition-all duration-300 ${scrolled || isDashboard || mobileMenuOpen
          ? 'bg-[#0d1117]/90 backdrop-blur-lg border-b border-brand-500/20'
          : 'bg-transparent'
        }`}>
        <div className="max-w-[1300px] mx-auto flex items-center justify-between px-4 sm:px-6 py-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={onViewProfile}>
            <img src="/logo.svg" className="h-8 max-w-[140px] md:max-w-none" alt="TipLnk" />
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8 font-bold">
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
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            {!connected && (
              <div className="flex items-center gap-2">
                <button
                  onClick={onGetStarted}
                  className="btn-secondary text-sm !px-5 hidden sm:block !min-h-[44px]"
                >
                  Log In
                </button>
                <button
                  onClick={onGetStarted}
                  className="btn-primary text-sm !px-5 flex items-center gap-2 !min-h-[44px]"
                >
                  <span className="hidden xs:inline">Start Earning</span>
                  <span className="xs:hidden">Join</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
            
            {connected && <WalletDropdown />}

            {/* Mobile Menu Toggle */}
            <button 
              className="md:hidden p-2 text-surface-400 hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0d1117] border-b border-surface-800 animate-in slide-in-from-top duration-300">
            <div className="px-6 py-8 space-y-6">
              {!isDashboard && (
                <>
                  <a 
                    href="#features" 
                    className="block text-lg font-bold text-surface-300 hover:text-brand-400"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Features
                  </a>
                  <a 
                    href="#compare" 
                    className="block text-lg font-bold text-surface-300 hover:text-brand-400"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Compare
                  </a>
                  {onboardingComplete && (
                    <button
                      onClick={() => {
                        onViewDashboard();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full text-left text-lg font-bold text-brand-400"
                    >
                      Dashboard
                    </button>
                  )}
                </>
              )}
              {!connected && (
                <button
                  onClick={() => {
                    onGetStarted();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full btn-secondary text-base py-4"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        )}
      </nav>
    </div>
  );
}
