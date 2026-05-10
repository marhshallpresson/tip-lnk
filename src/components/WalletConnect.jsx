import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDynamicContext, getAuthToken } from '@dynamic-labs/sdk-react-core';
import { Zap, Loader2, CheckCircle, Smartphone, Mail, Chrome, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function WalletConnect({ onConnected }) {
  const { user, syncWithDynamic, error: authError } = useAuth();
  const { user: dynamicUser, setShowAuthFlow } = useDynamicContext();
  const [syncing, setSyncing] = useState(false);
  const navigate = useNavigate();

  // ─── ELITE IDENTITY SYNC: AUTO-BRIDGE ───
  useEffect(() => {
    const handleDynamicSync = async () => {
      // If Dynamic says we're authenticated but we don't have a local session yet
      if (dynamicUser && !user && !syncing) {
        const dynamicJwt = getAuthToken();
        if (dynamicJwt) {
          setSyncing(true);
          try {
            const result = await syncWithDynamic(dynamicJwt);
            if (result.success) {
              onConnected?.(result.user?.walletAddress, true);
            }
          } finally {
            setSyncing(false);
          }
        }
      }
    };
    handleDynamicSync();
  }, [dynamicUser, user, syncWithDynamic, syncing, onConnected]);

  const handleOpenAuth = () => {
    sessionStorage.setItem('auth_origin', window.location.pathname);
    setShowAuthFlow(true);
  };

  if (user) {
    return (
      <div className="flex flex-col items-center gap-4 animate-fade-in p-8">
        <div className="w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
            <CheckCircle className="text-brand-500" size={32} />
        </div>
        <div className="text-center">
            <h3 className="font-bold text-white uppercase tracking-tighter italic">Authenticated</h3>
            <p className="text-surface-400 text-[10px] font-black uppercase tracking-widest mt-1">Ready for TipStack Operations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card !bg-[#0f0f11] !border-white/5 p-8 max-w-[400px] mx-auto animate-slide-up relative overflow-hidden">
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-brand-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-brand-500/20">
            <Zap className="text-brand-500" size={28} fill="currentColor" />
        </div>
        <h2 className="text-2xl font-black tracking-tighter italic uppercase">Identity Portal</h2>
        <p className="text-white/40 text-xs font-medium uppercase tracking-widest mt-1">Unified Secure Access</p>
      </div>

      <div className="space-y-4">
        <button 
          onClick={handleOpenAuth}
          disabled={syncing}
          className="btn-primary w-full h-14 flex items-center justify-center gap-3 group relative overflow-hidden"
        >
          {syncing ? <Loader2 className="animate-spin" size={20} /> : (
            <>
              <div className="flex items-center gap-1.5 mr-2">
                 <Chrome size={16} />
                 <Mail size={16} />
                 <Smartphone size={16} />
              </div>
              <span className="font-black uppercase tracking-widest text-[11px]">Continue with Identity</span>
            </>
          )}
        </button>

        <p className="text-center text-[9px] font-black text-white/20 uppercase tracking-[0.2em] pt-2">
          Secured via Dynamic.xyz Zero-Knowledge Protocol
        </p>

        {authError && (
          <div className="p-4 rounded-xl bg-accent-red/5 border border-accent-red/10 text-accent-red text-xs font-bold text-center animate-shake flex items-center justify-center gap-2">
              <AlertCircle size={14} /> {authError}
          </div>
        )}
      </div>
    </div>
  );
}
