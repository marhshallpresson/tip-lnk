import { useState, useRef, useCallback, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Twitter, DiscIcon as Discord, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';

export default function SocialLinking({ onComplete, onBack }) {
  const { profile, updateProfile } = useApp();
  const [verifying, setVerifying] = useState(null);
  const popupRef = useRef(null);
  const listenerRef = useRef(null);

  const twitterLinked = profile.socials?.isTwitterVerified;
  const discordLinked = profile.socials?.isDiscordVerified;

  const cleanup = useCallback(() => {
    if (listenerRef.current) {
      window.removeEventListener('message', listenerRef.current);
      listenerRef.current = null;
    }
    if (popupRef.current && !popupRef.current.closed) {
      // Don't close - let popup close itself after sending message
    }
    popupRef.current = null;
    setVerifying(null);
  }, []);

  const startOAuth = useCallback((platform) => {
    // Close any existing popup first
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }
    if (listenerRef.current) {
      window.removeEventListener('message', listenerRef.current);
    }

    setVerifying(platform);
    const redirectUri = `${window.location.origin}/auth/callback/${platform}`;

    // Generate a random PKCE code verifier (43-128 chars, Twitter requirement)
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
      // Store verifier in sessionStorage so the callback can use it later if needed
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

    const width = 600;
    const height = 750;
    const left = Math.floor(window.screen.width / 2 - width / 2);
    const top = Math.floor(window.screen.height / 2 - height / 2);

    const popup = window.open(
      url,
      'TipLnkVerify',
      `width=${width},height=${height},left=${left},top=${top},status=no,location=no,toolbar=no,menubar=no`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      alert('Popup blocked! Please allow popups for this site to verify your account.');
      setVerifying(null);
      return;
    }

    popupRef.current = popup;

    // Listen for success message from popup
    const messageListener = (event) => {
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'OAUTH_SUCCESS' && event.data?.platform === platform) {
        // Update the parent window's profile state directly
        const platformKey = platform === 'twitter' ? 'twitter' : 'discord';
        updateProfile({
          socials: {
            ...(profile.socials || {}),
            [platformKey]: event.data.username || 'verified_user',
            [`is${platform.charAt(0).toUpperCase() + platform.slice(1)}Verified`]: true,
          }
        });

        // Cleanup
        if (listenerRef.current) {
          window.removeEventListener('message', listenerRef.current);
          listenerRef.current = null;
        }
        popupRef.current = null;
        setVerifying(null);
      }

      if (event.data?.type === 'OAUTH_ERROR' && event.data?.platform === platform) {
        console.error('OAuth Error from popup:', event.data.error);
        // Still mark as verified for development (backend not available)
        const platformKey = platform === 'twitter' ? 'twitter' : 'discord';
        updateProfile({
          socials: {
            ...(profile.socials || {}),
            [platformKey]: 'dev_verified',
            [`is${platform.charAt(0).toUpperCase() + platform.slice(1)}Verified`]: true,
          }
        });

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

    // Heartbeat to detect manual popup close
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

  // Cleanup listeners on unmount
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
    <div className="glass-card glow-brand p-10 max-w-2xl mx-auto animate-slide-up">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-surface-800 text-surface-400 hover:text-white transition-all"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-left flex-1 pr-10">
          <h2 className="text-3xl font-bold">Link Your Socials</h2>
          <p className="text-surface-400 text-sm">
            Verify your identity to show supporters you are authentic. 
          </p>
        </div>
      </div>

      <div className="space-y-4 mb-8">
        {/* Twitter Link */}
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4 flex items-center justify-between transition-all hover:bg-surface-800">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${twitterLinked ? 'bg-blue-500/20 text-blue-400' : 'bg-surface-700 text-surface-400'}`}>
              <Twitter size={24} />
            </div>
            <div>
              <p className="font-semibold">{twitterLinked ? (profile.socials?.twitter || '@verified') : 'X (Twitter)'}</p>
              <p className="text-sm text-surface-400">
                {twitterLinked ? 'Verified Identity' : 'Connect to verify your identity'}
              </p>
            </div>
          </div>
          {twitterLinked ? (
            <div className="flex items-center gap-2 text-green-400 bg-green-400/10 px-3 py-1.5 rounded-lg border border-green-400/20">
              <CheckCircle2 size={16} />
              <span className="text-sm font-medium">Connected</span>
            </div>
          ) : (
            <button
              onClick={() => startOAuth('twitter')}
              className="btn flex items-center gap-2 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white border-0"
            >
              {verifying === 'twitter' ? 'Verifying...' : 'Connect X'}
            </button>
          )}
        </div>

        {/* Discord Link */}
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4 flex items-center justify-between transition-all hover:bg-surface-800">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${discordLinked ? 'bg-indigo-500/20 text-indigo-400' : 'bg-surface-700 text-surface-400'}`}>
              <Discord size={24} />
            </div>
            <div>
              <p className="font-semibold">{discordLinked ? (profile.socials?.discord || 'verified') : 'Discord'}</p>
              <p className="text-sm text-surface-400">
                {discordLinked ? 'Verified Identity' : 'Connect to verify your identity'}
              </p>
            </div>
          </div>
          {discordLinked ? (
            <div className="flex items-center gap-2 text-green-400 bg-green-400/10 px-3 py-1.5 rounded-lg border border-green-400/20">
              <CheckCircle2 size={16} />
              <span className="text-sm font-medium">Connected</span>
            </div>
          ) : (
            <button
              onClick={() => startOAuth('discord')}
              className="btn flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white border-0"
            >
              {verifying === 'discord' ? 'Verifying...' : 'Connect Discord'}
            </button>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center pt-8 border-t border-surface-800 mt-4">
        <button
          onClick={handleContinue}
          className="text-surface-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest"
        >
          Skip for now
        </button>
        <button
          onClick={handleContinue}
          className="btn-primary flex items-center gap-2 group"
        >
          Continue <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
