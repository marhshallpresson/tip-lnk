import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getProfile } from '../utils/database';
import TipWidget from './TipWidget';
import { Loader2, ShieldCheck, X, Zap, Globe, Heart, Shield } from 'lucide-react';

/**
 * Premium "Scan to Pay" Checkout Page
 * Optimized for mobile showing and rapid conversion.
 */
export default function CheckoutPage() {
  const { wallet } = useParams();
  const [searchParams] = useSearchParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isEmbed = searchParams.get('embed') === 'true';
  const theme = searchParams.get('theme') || 'dark';
  const accent = searchParams.get('accent') || '#00D265';

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const data = await getProfile(wallet);
        if (data) {
          setProfile(data);
        } else {
          setError('Profile not found');
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [wallet]);

  const handleClose = () => {
    if (window.parent) {
      window.parent.postMessage('tipstack-close', '*');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000000]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-[24px] bg-brand-500/10 flex items-center justify-center border border-brand-500/20">
            <Zap size={32} className="text-brand-500 animate-pulse" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Loading Engine...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#000000] text-white">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4 text-red-500">
           <X size={32} />
        </div>
        <h2 className="text-xl font-bold mb-2">Creator Not Found</h2>
        <p className="text-white/40 text-sm mb-8 max-w-xs">The creator link you followed might be broken or the handle is invalid.</p>
        <button onClick={() => window.location.href = '/'} className="btn-secondary">Go to Homepage</button>
      </div>
    );
  }

  const identifier = profile.solDomain || profile.displayName || wallet;

  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-[#000000] text-white' : 'bg-white text-black'} selection:bg-brand-500 selection:text-black font-sans`}>
      
      {/* Dynamic Background Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-96 bg-brand-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Main Container */}
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-6 pt-12 pb-20 relative z-10">
        
        {/* Header Profile Section */}
        <div className="text-center mb-12 animate-slide-up">
           <div className="relative inline-block mb-6">
              <div className="w-24 h-24 rounded-[32px] bg-[#111111] overflow-hidden border-2 border-white/5 shadow-2xl mx-auto ring-8 ring-brand-500/5 transition-transform hover:scale-105 duration-500">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-black text-white/20">
                    {(profile.displayName || wallet)[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-brand-500 text-black p-1.5 rounded-xl shadow-xl">
                 <ShieldCheck size={18} fill="currentColor" stroke="none" />
              </div>
           </div>

           <h1 className="text-3xl font-black tracking-tighter mb-2">{profile.displayName || 'Anonymous Creator'}</h1>
           
           <div className="flex items-center justify-center gap-3">
              <div className="grass-pill !bg-white/5 border-white/10 flex items-center gap-2">
                <Globe size={12} className="text-brand-500" />
                <span className="text-[10px] font-bold text-white/60 tracking-tight">{profile.solDomain || `${identifier.toLowerCase()}.tipstack.sol`}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-black text-white/20 uppercase tracking-widest">
                 <Shield size={10} /> Verified
              </div>
           </div>
        </div>

        {/* Tipping Engine */}
        <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
           <TipWidget 
             fixedRecipient={{
               username: profile.displayName || profile.id.slice(0, 8),
               address: profile.id,
               fiatEnabled: profile.fiatEnabled
             }} 
             theme={theme}
             accent={accent}
             onSuccess={(result) => {
                console.log('âœ… Tip successful!', result);
                if (isEmbed) {
                  window.parent.postMessage({ type: 'tipstack-success', result }, '*');
                }
             }}
           />
        </div>


        {/* Support Callout */}
        <div className="mt-12 p-6 bg-white/5 border border-white/10 rounded-[32px] text-center space-y-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
           <div className="w-12 h-12 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500 mx-auto">
              <Heart size={24} fill="currentColor" />
           </div>
           <div>
              <p className="text-sm font-bold text-white">Your support matters.</p>
              <p className="text-xs text-white/40 leading-relaxed px-4">All tips are non-custodial and settled instantly to the creator's wallet on Solana.</p>
           </div>
        </div>
      </div>

      {/* Security Footer */}
      <footer className="p-8 text-center border-t border-white/5 bg-black/50 backdrop-blur-md">
        <div className="flex items-center justify-center gap-2 mb-2">
           <Zap size={14} className="text-brand-500" />
           <p className="text-[10px] text-white font-black uppercase tracking-[0.2em]">
             Powered by Tip Stack
           </p>
        </div>
        <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest leading-loose">
           Built for the Frontier • Secured by Solana
        </p>
      </footer>

      {isEmbed && (
        <button 
          onClick={handleClose}
          className="fixed top-6 right-6 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/40 hover:text-white transition-all backdrop-blur-xl z-[100]"
        >
          <X size={24} />
        </button>
      )}
    </div>
  );
}
