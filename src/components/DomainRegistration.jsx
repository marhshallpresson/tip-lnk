import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Globe, Check, Loader2, AlertCircle, Search } from 'lucide-react';

// Simulate .sol domain lookup
const TAKEN_DOMAINS = ['alice', 'bob', 'crypto', 'solana', 'nft', 'defi'];

export default function DomainRegistration({ onComplete }) {
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

    // Simulate SNS lookup
    await new Promise((r) => setTimeout(r, 1500));
    const isTaken = TAKEN_DOMAINS.includes(domain.trim().toLowerCase());
    setAvailable(!isTaken);
    setChecking(false);
  };

  const registerDomain = async () => {
    setRegistering(true);
    // Simulate transaction
    await new Promise((r) => setTimeout(r, 2500));
    const fullDomain = `${domain.trim().toLowerCase()}.sol`;
    updateProfile({ solDomain: fullDomain, displayName: domain.trim() });
    setRegistered(true);
    setRegistering(false);
    setTimeout(() => onComplete(), 1000);
  };

  return (
    <div className="glass-card glow-brand p-10 max-w-lg mx-auto">
      <div className="text-center mb-8">
        <div className="w-20 h-20 rounded-2xl bg-accent-cyan/20 flex items-center justify-center mx-auto mb-6">
          <Globe size={36} className="text-accent-cyan" />
        </div>
        <h2 className="text-3xl font-bold mb-3">Claim Your .sol Domain</h2>
        <p className="text-surface-400">
          Register a Solana Name Service domain as your on-chain identity. This will be your public creator name.
        </p>
      </div>

      {registered ? (
        <div className="bg-accent-green/10 border border-accent-green/30 rounded-xl p-6 text-center">
          <Check size={32} className="text-accent-green mx-auto mb-3" />
          <p className="text-accent-green font-semibold text-lg">
            {domain.trim().toLowerCase()}.sol registered
          </p>
          <p className="text-surface-400 text-sm mt-1">Redirecting to your dashboard...</p>
        </div>
      ) : (
        <>
          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <input
                type="text"
                className="input-field w-full pr-12"
                placeholder="yourname"
                value={domain}
                onChange={(e) => {
                  setDomain(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''));
                  setAvailable(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && checkAvailability()}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-500 font-mono text-sm">
                .sol
              </span>
            </div>
            <button
              onClick={checkAvailability}
              disabled={!domain.trim() || checking}
              className="btn-primary flex items-center gap-2"
            >
              {checking ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Check
            </button>
          </div>

          {available === true && (
            <div className="bg-accent-green/10 border border-accent-green/30 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check size={16} className="text-accent-green" />
                  <span className="text-accent-green font-medium">
                    {domain.toLowerCase()}.sol is available
                  </span>
                </div>
                <span className="text-surface-400 text-sm">~0.01 SOL</span>
              </div>
              <button
                onClick={registerDomain}
                disabled={registering}
                className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
              >
                {registering ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Registering...
                  </>
                ) : (
                  'Register Domain'
                )}
              </button>
            </div>
          )}

          {available === false && (
            <div className="bg-accent-red/10 border border-accent-red/30 rounded-xl p-4 flex items-center gap-2">
              <AlertCircle size={16} className="text-accent-red shrink-0" />
              <span className="text-accent-red text-sm">
                {domain.toLowerCase()}.sol is already taken. Try another name.
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
