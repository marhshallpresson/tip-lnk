import { useState, useEffect } from 'react';
import { Zap, ArrowRight, User, LayoutDashboard } from 'lucide-react';
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled || isDashboard 
        ? 'bg-[#0d1117]/90 backdrop-blur-lg border-b border-[#c4ff00]/20' 
        : 'bg-transparent'
    }`}>
      <div className="max-w-[1200px] mx-auto flex items-center justify-between px-4 sm:px-6 py-4">
        <div className="flex items-center gap-2 cursor-pointer" onClick={onViewProfile}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c4ff00] to-green-600 flex items-center justify-center shadow-[0_0_15px_rgba(196,255,0,0.4)]">
            <Zap size={20} className="text-black" />
          </div>
          <span className="text-2xl font-black tracking-tight text-white">TipLnk</span>
        </div>

        <div className="hidden md:flex items-center gap-8 font-medium">
          {!isDashboard ? (
            <>
              <a href="#features" className="text-sm text-surface-400 hover:text-brand-400 transition-colors">Features</a>
              <a href="#compare" className="text-sm text-surface-400 hover:text-brand-400 transition-colors">Compare</a>
              {onboardingComplete && (
                <button 
                  onClick={onViewDashboard}
                  className="flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 font-bold transition-all"
                >
                  <LayoutDashboard size={14} /> Dashboard
                </button>
              )}
            </>
          ) : (
            <>
              <button 
                onClick={onViewProfile}
                className="flex items-center gap-2 text-sm text-surface-400 hover:text-brand-400 font-bold transition-all"
              >
                <User size={14} /> Public Identity
              </button>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {connected ? (
            <WalletDropdown />
          ) : (
            <div className="flex items-center gap-3">
              <button 
                onClick={onGetStarted} 
                className="btn-secondary text-sm !px-6 hidden sm:block"
              >
                Log In
              </button>
              <button 
                onClick={onGetStarted} 
                className="btn-primary text-sm !px-6 flex items-center gap-2"
              >
                Start Earning <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
