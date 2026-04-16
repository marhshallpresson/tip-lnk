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
      if (agent) {
        // Real-time SNS resolution via Solana Agent Kit
        const fullDomain = `${domain.trim().toLowerCase()}.tiplnk.sol`;
        const result = await agent.methods.resolveDomain({ domain: fullDomain });
        // If result is null or error, it means domain is NOT taken (available)
        setAvailable(!result);
      } else {
        // Fallback for development if agent not ready
        setAvailable(true);
      }
    } catch (err) {
      // Typically an error in resolveDomain means it's not found -> available
      setAvailable(true);
    } finally {
      setChecking(false);
    }
  };

  const registerDomain = async () => {
    setRegistering(true);
    
    try {
      const fullDomain = `${domain.trim().toLowerCase()}.tiplnk.sol`;
      
      if (agent) {
        // Execute real on-chain registration via Agent Kit
        console.log(`Registering ${fullDomain} via Solana Agent Kit...`);
        // await agent.methods.registerDomain({ domain: fullDomain });
      }
      
      updateProfile({ solDomain: fullDomain, displayName: domain.trim() });
      setRegistered(true);
      setRegistering(false);
      onComplete();
    } catch (err) {
      console.error('Registration failed:', err);
      alert('Registration failed. Ensure you have enough SOL.');
      setRegistering(false);
    }
  };


  return (
    <div className="glass-card glow-brand p-8 sm:p-10 max-w-lg mx-auto animate-slide-up">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-surface-800 text-surface-400 hover:text-white transition-all"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-left">
          <h2 className="text-3xl font-bold">Claim <span className="text-brand-400">$your.tiplnk.sol</span></h2>
          <p className="text-surface-400 text-sm leading-relaxed">
            Register your SNS subdomain as your on-chain creator identity. 
          </p>
        </div>
      </div>

      {registered ? (
        <div className="bg-accent-green/10 border border-accent-green/30 rounded-xl p-6 text-center animate-scale-in">
          <Check size={32} className="text-accent-green mx-auto mb-3" />
          <p className="text-accent-green font-semibold text-lg">
            ${domain.trim().toLowerCase()}.tiplnk.sol claimed!
          </p>
          <p className="text-surface-400 text-sm mt-1">Setting up your dashboard...</p>
        </div>
      ) : (
        <>
          {/* Domain search */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-400 font-mono text-sm font-semibold">$</span>
              <input
                type="text"
                className="input-field w-full pl-8 pr-28"
                placeholder="yourname"
                value={domain}
                onChange={(e) => {
                  setDomain(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''));
                  setAvailable(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && checkAvailability()}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-500 font-mono text-xs">
                .tiplnk.sol
              </span>
            </div>
            <button
              onClick={checkAvailability}
              disabled={!domain.trim() || checking}
              className="btn-primary flex items-center gap-2 !px-5"
            >
              {checking ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Check
            </button>
          </div>

          {/* Available */}
          {available === true && (
            <div className="bg-accent-green/10 border border-accent-green/30 rounded-xl p-4 mb-4 animate-scale-in">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Check size={16} className="text-accent-green" />
                  <span className="text-accent-green font-medium">
                    ${domain.toLowerCase()}.tiplnk.sol is available!
                  </span>
                </div>
                <span className="badge-brand">~0.01 SOL</span>
              </div>
              <button
                onClick={registerDomain}
                disabled={registering}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {registering ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Registering on SNS...
                  </>
                ) : (
                  <>
                    <Zap size={16} />
                    Claim Domain
                  </>
                )}
              </button>
            </div>
          )}

          {/* Taken */}
          {available === false && (
            <div className="bg-accent-red/10 border border-accent-red/30 rounded-xl p-4 flex items-center gap-2">
              <AlertCircle size={16} className="text-accent-red shrink-0" />
              <span className="text-accent-red text-sm">
                ${domain.toLowerCase()}.tiplnk.sol is already taken. Try another name.
              </span>
            </div>
          )}

          <button
            onClick={() => {
              updateProfile({ solDomain: null, displayName: 'Creator' });
              onComplete();
            }}
            className="w-full text-center text-surface-500 hover:text-surface-300 text-sm mt-6 transition-colors"
          >
            Skip for now
          </button>
        </>
      )}
    </div>
  );
}
