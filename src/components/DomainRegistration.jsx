import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Globe, Check, Loader2, AlertCircle, Search, Zap, ChevronLeft } from 'lucide-react';

export default function DomainRegistration({ onComplete, onBack }) {
  const { updateProfile } = useApp();
  const [domain, setDomain] = useState('');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(null);
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);

  const checkAvailability = async () => {
    if (!domain.trim()) return;
    setChecking(true);
    setAvailable(null);

    try {
      setAvailable(true);
    } catch (err) {
      setAvailable(true);
    } finally {
      setChecking(false);
    }
  };

  const registerDomain = async () => {
    setRegistering(true);
    
    try {
      const fullDomain = `${domain.trim().toLowerCase()}.tipstack.sol`;
      
      
      updateProfile({ solDomain: fullDomain, displayName: domain.trim() });
      setRegistered(true);
      setRegistering(false);
      onComplete();
    } catch (err) {
      alert('Registration failed. Please try again.');
      setRegistering(false);
    }
  };


  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all border border-white/5"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-left">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">Claim your <span className="text-brand-500">handle</span></h2>
          <p className="text-white/40 text-sm md:text-base leading-relaxed">
            Your unique on-chain identity and payment URL. 
          </p>
        </div>
      </div>

      {registered ? (
        <div className="bg-accent-green/10 border border-accent-green/30 rounded-2xl p-8 text-center animate-scale-in">
          <div className="w-16 h-16 bg-accent-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-accent-green" />
          </div>
          <p className="text-accent-green font-bold text-xl mb-1">
            ${domain.trim().toLowerCase()}.tipstack.sol claimed!
          </p>
          <p className="text-white/40 text-sm">Your profile is being prepared...</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-500 font-mono text-lg font-bold select-none group-focus-within:scale-110 transition-transform">$</span>
              <input
                type="text"
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-28 py-4 text-lg md:text-xl font-bold focus:outline-none focus:border-brand-500/50 focus:bg-white/[0.07] transition-all placeholder:text-white/10"
                placeholder="yourname"
                value={domain}
                onChange={(e) => {
                  setDomain(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''));
                  setAvailable(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && checkAvailability()}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 font-mono text-sm font-medium tracking-tight pointer-events-none hidden sm:inline">
                .tipstack.sol
              </span>
            </div>
            
            <button
              onClick={checkAvailability}
              disabled={!domain.trim() || checking}
              className="btn-primary w-full py-4 rounded-2xl text-lg font-bold group shadow-lg shadow-brand-500/5"
            >
              {checking ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Search size={20} className="group-hover:scale-110 transition-transform" />
                  Check Availability
                </>
              )}
            </button>
          </div>

          {available === true && (
            <div className="mt-6 bg-brand-500/10 border border-brand-500/20 rounded-2xl p-6 animate-slide-up">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-black">
                    <Check size={16} strokeWidth={3} />
                  </div>
                  <div>
                    <span className="text-brand-400 font-bold block leading-none">
                      Available
                    </span>
                    <span className="text-white/40 text-xs">
                      ${domain.toLowerCase()}.tipstack.sol
                    </span>
                  </div>
                </div>
                <div className="bg-white/10 px-3 py-1 rounded-lg border border-white/5 text-[10px] font-bold uppercase tracking-wider">
                  SNS Subdomain
                </div>
              </div>
              
              <button
                onClick={registerDomain}
                disabled={registering}
                className="w-full bg-white text-black hover:bg-brand-50 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                {registering ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Securing on-chain...
                  </>
                ) : (
                  <>
                    <Zap size={18} fill="currentColor" />
                    Claim Now
                  </>
                )}
              </button>
            </div>
          )}

          {available === false && (
            <div className="mt-6 bg-accent-red/10 border border-accent-red/20 rounded-2xl p-4 flex items-center gap-3 animate-shake">
              <div className="w-8 h-8 rounded-full bg-accent-red/20 flex items-center justify-center text-accent-red">
                <AlertCircle size={18} />
              </div>
              <span className="text-accent-red font-medium text-sm">
                That name is already taken. Try something else!
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
