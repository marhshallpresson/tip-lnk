import { useState, useRef, useCallback, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { MessageSquare, CheckCircle2, ChevronRight, ChevronLeft, Share2, Disc } from 'lucide-react';

export default function SocialLinking({ onComplete, onBack }) {
  const { profile, updateProfile } = useApp();
  const [verifying, setVerifying] = useState(null);
  const popupRef = useRef(null);
  const listenerRef = useRef(null);

  const twitterLinked = profile.socials?.isTwitterVerified;
  const discordLinked = profile.socials?.isDiscordVerified;

  const TwitterIcon = Share2;
  const DiscordIcon = MessageSquare;

  const cleanup = useCallback(() => {
    if (listenerRef.current) {
      window.removeEventListener('message', listenerRef.current);
      listenerRef.current = null;
    }
    if (popupRef.current && !popupRef.current.closed) {
    }
    popupRef.current = null;
    setVerifying(null);
  }, []);

  const startOAuth = useCallback((platform) => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }
    if (listenerRef.current) {
      window.removeEventListener('message', listenerRef.current);
    }

    setVerifying(platform);
    const redirectUri = `${window.location.origin}/auth/callback/${platform}`;

    const generatePKCEVerifier = () => {
      let result = '';
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
      const randomArray = new Uint8Array(64);
      crypto.getRandomValues(randomArray);
      for (let i = 0; i < 64; i++) {
        result += chars[randomArray[i] % chars.length];
      }
      return result;
    };

    let url = '';
    if (platform === 'twitter') {
      const clientId = import.meta.env.VITE_X_CLIENT_ID;
      if (!clientId) {
        alert('Verification Setup Error: X Client ID is not configured.');
        setVerifying(null);
        return;
      }
      const codeVerifier = generatePKCEVerifier();
      const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem(`pkce_verifier_${platform}`, codeVerifier);
      url = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=users.read%20tweet.read%20offline.access&state=${state}&code_challenge=${codeVerifier}&code_challenge_method=plain`;
    } else if (platform === 'discord') {
      const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
      if (!clientId) {
        alert('Verification Setup Error: Discord Client ID is not configured.');
        setVerifying(null);
        return;
      }
      url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify%20email`;
    }

    if (!url) return;

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      window.location.href = url;
      return;
    }

    const width = 600;
    const height = 750;
    const left = Math.floor(window.screen.width / 2 - width / 2);
    const top = Math.floor(window.screen.height / 2 - height / 2);

    const popup = window.open(
      url,
      'Tip StackVerify',
      `width=${width},height=${height},left=${left},top=${top},status=no,location=no,toolbar=no,menubar=no`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      alert('Popup blocked! Please allow popups for this site to verify your account.');
      setVerifying(null);
      return;
    }

    popupRef.current = popup;

    const messageListener = (event) => {
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'OAUTH_SUCCESS' && event.data?.platform === platform) {
        const handleKey = platform === 'twitter' ? 'twitterHandle' : 'discordHandle';
        const verifyKey = platform === 'twitter' ? 'isTwitterVerified' : 'isDiscordVerified';
        
        const updates = {
          [handleKey]: event.data.username || 'verified_user',
          socials: {
            ...(profile.socials || {}),
            [verifyKey]: true,
            [platform]: event.data.username || 'verified_user',
          }
        };

        if (platform === 'twitter' && event.data.details) {
          const { name, bio, avatar } = event.data.details;
          updates.displayName = profile.displayName || name;
          updates.bio = profile.bio || bio;
          updates.avatarUrl = profile.avatarUrl || avatar;
          if (profile.avatarType === 'none') updates.avatarType = 'social';
        }
        
        updateProfile(updates);

        if (listenerRef.current) {
          window.removeEventListener('message', listenerRef.current);
          listenerRef.current = null;
        }
        popupRef.current = null;
        setVerifying(null);
      }

      if (event.data?.type === 'OAUTH_ERROR' && event.data?.platform === platform) {
        console.error('OAuth Error from popup:', event.data.error);
        alert(`Verification failed: ${event.data.error}`);

        if (listenerRef.current) {
          window.removeEventListener('message', listenerRef.current);
          listenerRef.current = null;
        }
        popupRef.current = null;
        setVerifying(null);
      }
    };

    listenerRef.current = messageListener;
    window.addEventListener('message', messageListener);

    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        if (listenerRef.current) {
          window.removeEventListener('message', listenerRef.current);
          listenerRef.current = null;
        }
        popupRef.current = null;
        setVerifying(null);
      }
    }, 1000);
  }, [profile.socials, updateProfile]);

  useEffect(() => {
    return () => {
      if (listenerRef.current) {
        window.removeEventListener('message', listenerRef.current);
      }
    };
  }, []);

  const handleContinue = () => {
    onComplete();
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
        <div className="text-left flex-1">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">Verify <span className="text-brand-500">Socials</span></h2>
          <p className="text-white/40 text-sm md:text-base">
            Build trust with your supporters by linking your verified accounts. 
          </p>
        </div>
      </div>

      <div className="space-y-3 mb-10">
        {/* Twitter Link */}
        <div className={`p-5 rounded-2xl border transition-all ${twitterLinked ? 'border-brand-500/30 bg-brand-500/5' : 'border-white/5 bg-white/5 hover:border-white/10'}`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${twitterLinked ? 'bg-brand-500 text-black' : 'bg-white/5 text-white/40'}`}>
                <TwitterIcon size={24} />
              </div>
              <div>
                <p className="font-bold text-base md:text-lg">{twitterLinked ? (profile.socials?.twitter || '@verified') : 'X (Twitter)'}</p>
                <p className="text-xs text-white/30">
                  {twitterLinked ? 'Identity Verified' : 'Connect your X profile'}
                </p>
              </div>
            </div>
            {twitterLinked ? (
              <div className="hidden sm:flex items-center gap-2 text-brand-500 bg-brand-500/10 px-3 py-1.5 rounded-lg border border-brand-500/20">
                <CheckCircle2 size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Linked</span>
              </div>
            ) : (
              <button
                onClick={() => startOAuth('twitter')}
                disabled={verifying === 'twitter'}
                className="bg-white text-black hover:bg-brand-50 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
              >
                {verifying === 'twitter' ? '...' : 'Connect'}
              </button>
            )}
          </div>
          {twitterLinked && (
             <div className="mt-3 sm:hidden flex items-center gap-2 text-brand-500 bg-brand-500/10 px-3 py-1.5 rounded-lg border border-brand-500/20 w-fit">
                <CheckCircle2 size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Linked</span>
             </div>
          )}
        </div>

        {/* Discord Link */}
        <div className={`p-5 rounded-2xl border transition-all ${discordLinked ? 'border-brand-500/30 bg-brand-500/5' : 'border-white/5 bg-white/5 hover:border-white/10'}`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${discordLinked ? 'bg-brand-500 text-black' : 'bg-white/5 text-white/40'}`}>
                <DiscordIcon size={24} />
              </div>
              <div>
                <p className="font-bold text-base md:text-lg">{discordLinked ? (profile.socials?.discord || 'verified') : 'Discord'}</p>
                <p className="text-xs text-white/30">
                  {discordLinked ? 'Identity Verified' : 'Connect your Discord'}
                </p>
              </div>
            </div>
            {discordLinked ? (
              <div className="hidden sm:flex items-center gap-2 text-brand-500 bg-brand-500/10 px-3 py-1.5 rounded-lg border border-brand-500/20">
                <CheckCircle2 size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Linked</span>
              </div>
            ) : (
              <button
                onClick={() => startOAuth('discord')}
                disabled={verifying === 'discord'}
                className="bg-white text-black hover:bg-brand-50 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
              >
                {verifying === 'discord' ? '...' : 'Connect'}
              </button>
            )}
          </div>
          {discordLinked && (
             <div className="mt-3 sm:hidden flex items-center gap-2 text-brand-500 bg-brand-500/10 px-3 py-1.5 rounded-lg border border-brand-500/20 w-fit">
                <CheckCircle2 size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Linked</span>
             </div>
          )}
        </div>
      </div>

      <div className="pt-8 border-t border-white/5">
        <button
          onClick={handleContinue}
          disabled={!twitterLinked && !discordLinked}
          className="btn-primary w-full py-4 rounded-2xl text-lg font-bold group disabled:opacity-50 disabled:grayscale transition-all"
        >
          {(!twitterLinked && !discordLinked) ? 'Link at least one social' : 'Continue'} 
          <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
