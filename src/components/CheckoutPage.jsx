import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getProfile } from '../utils/database';
import TipWidget from './TipWidget';
import { Loader2, ShieldCheck, X } from 'lucide-react';

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
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-[#0d1117]' : 'bg-white'}`}>
        <Loader2 size={32} className="text-brand-500 animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-center ${theme === 'dark' ? 'bg-[#0d1117] text-white' : 'bg-white text-black'}`}>
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4 text-red-500">
           <X size={32} />
        </div>
        <h2 className="text-xl font-bold mb-2">Checkout Error</h2>
        <p className="text-surface-500 text-sm mb-6">{error || 'Invalid creator wallet or handle.'}</p>
        <button onClick={handleClose} className="btn-secondary">Close</button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-[#0d1117] text-white' : 'bg-white text-black'} selection:bg-brand-500 selection:text-black`}>
      {/* Minimal Header */}
      <div className="p-6 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-900 overflow-hidden border border-white/10">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-black text-white/20">
                {(profile.displayName || wallet)[0].toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <h1 className="font-black text-sm leading-none mb-1">{profile.solDomain || profile.displayName || 'Creator'}</h1>
            <div className="flex items-center gap-1 text-[10px] text-brand-500 font-bold uppercase tracking-widest">
              <ShieldCheck size={10} /> Verified on Tip Stack
            </div>
          </div>
        </div>
        {isEmbed && (
          <button 
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-white/5 text-surface-500 transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Main Checkout Area */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-sm mx-auto">
           <TipWidget 
             fixedRecipient={{
               username: profile.solDomain || profile.displayName || profile.walletAddress.slice(0, 8),
               address: profile.walletAddress
             }} 
             theme={theme}
             accent={accent}
             onSuccess={() => {
                setTimeout(handleClose, 3000);
             }}
           />
        </div>
      </div>

      {/* Security Footer */}
      <div className="p-4 text-center border-t border-white/5 bg-white/10">
        <p className="text-[10px] text-surface-500 font-bold uppercase tracking-[0.2em]">
          Secure Checkout Powered by Tip Stack
        </p>
      </div>
    </div>
  );
}
