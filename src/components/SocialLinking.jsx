import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Twitter, DiscIcon as Discord, CheckCircle2, ChevronRight } from 'lucide-react';

export default function SocialLinking({ onComplete }) {
  const { profile, updateProfile } = useApp();
  const [verifying, setVerifying] = useState(null);
  
  const twitterLinked = profile.socials?.isTwitterVerified;
  const discordLinked = profile.socials?.isDiscordVerified;

  const startOAuth = (platform) => {
    setVerifying(platform);
    const redirectUri = `${window.location.origin}/auth/callback/${platform}`;
    
    let url = '';
    if (platform === 'twitter') {
      const clientId = import.meta.env.VITE_X_CLIENT_ID;
      if (!clientId) {
        alert('Verification Setup Error: X Client ID is not configured.');
        setVerifying(null);
        return;
      }
      url = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=users.read%20tweet.read&state=state&code_challenge=challenge&code_challenge_method=plain`;
    } else if (platform === 'discord') {
      const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
      if (!clientId) {
        alert('Verification Setup Error: Discord Client ID is not configured.');
        setVerifying(null);
        return;
      }
      url = `https://discord.com/api/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify%20email`;
    }

    if (url) {
      const width = 600;
      const height = 750;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
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
      
      const messageListener = (event) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data?.type === 'OAUTH_SUCCESS' && event.data?.platform === platform) {
          window.removeEventListener('message', messageListener);
          setVerifying(null);
          // Note: AppContext state is updated by the AuthCallbackHandler in the popup
        }
      };
      
      window.addEventListener('message', messageListener);

      // Heartbeat to detect manual popup close
      const timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer);
          setVerifying(null);
          window.removeEventListener('message', messageListener);
        }
      }, 1000);
    }
  };

  const handleContinue = () => {
    onComplete();
  };

  return (
    <div className="glass-card glow-brand p-10 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-20 h-20 rounded-2xl bg-brand-500/20 flex items-center justify-center mx-auto mb-6">
          <Twitter size={36} className="text-brand-400" />
        </div>
        <h2 className="text-3xl font-bold mb-3">Link Your Socials</h2>
        <p className="text-surface-400">
          Verify your identity to show supporters you are authentic. Verified profiles get 3x more tips.
        </p>
      </div>

      <div className="space-y-4 mb-8">
        {/* Twitter Link */}
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4 flex items-center justify-between transition-all hover:bg-surface-800">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${twitterLinked ? 'bg-blue-500/20 text-blue-400' : 'bg-surface-700 text-surface-400'}`}>
              <Twitter size={24} />
            </div>
            <div>
              <p className="font-semibold">{twitterLinked ? '@creator_sol' : 'X (Twitter)'}</p>
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
            onClick={() =>
          {window.open(startOAuth('twitter'),    
          'popupWindow',
          'width=600,height=400'); }}
              className="btn flex items-center gap-2 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white border-0"
            >
              Connect X
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
              <p className="font-semibold">{discordLinked ? 'creator#1234' : 'Discord'}</p>
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
              Connect Discord
            </button>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <button 
          onClick={handleContinue}
          className="text-surface-400 hover:text-white transition-colors text-sm font-medium"
        >
          Skip for now
        </button>
        <button 
          onClick={handleContinue}
          className="btn-primary flex items-center gap-2"
        >
          Continue <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
