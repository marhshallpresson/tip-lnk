import { useState, useEffect } from 'react';
import { Zap, ArrowRight, User, LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
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
      <nav className={`transition-all duration-500 ${scrolled || isDashboard || mobileMenuOpen
          ? 'bg-[#050505]/80 backdrop-blur-xl border-b border-white/5'
          : 'bg-transparent'
        }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={onViewProfile}>
            <img src="/logo.svg" className="h-10 max-w-[150px] md:max-w-none" alt="Tip Stack" />

          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-10">
            {!isDashboard ? (
              <>
                <a href="#features" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-brand-500 transition-colors">Features</a>
                <a href="#compare" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-brand-500 transition-colors">Yields</a>
                {onboardingComplete && (
                  <button
                    onClick={onViewDashboard}
                    className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-500 hover:text-brand-400 transition-all"
                  >
                    Dashboard
                  </button>
                )}
              </>
            ) : (
                <div className="grass-pill !bg-white/5 border-white/10">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/60 italic">Creator Console</span>
                </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {!connected && (
              <div className="flex items-center gap-3">
                <button
                  onClick={onGetStarted}
                  className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hidden sm:block"
                >
                  Log In
                </button>
                <button
                  onClick={onGetStarted}
                  className="px-5 py-2.5 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5"
                >
                  Start Earning
                </button>
              </div>
            )}
            
            {connected && <WalletDropdown />}

            {/* Mobile Menu Toggle */}
            <button 
              className="md:hidden w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#050505] border-b border-white/5 animate-in slide-in-from-top duration-500">
            <div className="px-8 py-10 space-y-8">
              {!isDashboard && (
                <>
                  <a 
                    href="#features" 
                    className="block text-2xl font-black tracking-tighter text-white"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Features
                  </a>
                  <a 
                    href="#compare" 
                    className="block text-2xl font-black tracking-tighter text-white"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Yield Metrics
                  </a>
                </>
              )}
              {!connected && (
                <button
                  onClick={() => {
                    onGetStarted();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-5 bg-brand-500 text-black text-sm font-black uppercase tracking-widest rounded-2xl"
                >
                  Start Earning
                </button>
              )}
            </div>
          </div>
        )}
      </nav>
    </div>
  );
}
