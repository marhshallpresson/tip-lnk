import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Twitter, DiscIcon as Discord, CheckCircle2, ChevronRight } from 'lucide-react';

export default function SocialLinking({ onComplete }) {
  const { updateProfile } = useApp();
  const [twitterLinked, setTwitterLinked] = useState(false);
  const [discordLinked, setDiscordLinked] = useState(false);
  const [loadingCode, setLoadingCode] = useState(null);

  const simulateLink = (platform) => {
    setLoadingCode(platform);
    
    // In a production app, this would be the official X/Discord OAuth URL.
    // For this simulation, we point to our internal callback handler.
    const oauthUrl = `${window.location.origin}/auth/callback/${platform}?code=simulated_auth_code_123`;
    
    setTimeout(() => {
      if (platform === 'twitter') setTwitterLinked(true);
      if (platform === 'discord') setDiscordLinked(true);
      setLoadingCode(null);
    }, 2000);

    return oauthUrl;
  };

  const handleContinue = () => {
    updateProfile({
      socials: {
        twitter: twitterLinked ? '@creator_sol' : null,
        discord: discordLinked ? 'creator#1234' : null,
      }
    });
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
              onClick={() => {window.open(simulateLink('twitter'),'popupWindow', 'width=600,height=400'); }}
              className="btn flex items-center gap-2 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white border-0"
              disabled={loadingCode === 'twitter'}
            >
              {loadingCode === 'twitter' ? 'Connecting...' : 'Connect X'}
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
              onClick={() => {window.open(simulateLink('discord'),'popupWindow', 'width=600,height=400'); }}
              className="btn flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white border-0"
              disabled={loadingCode === 'discord'}
            >
              {loadingCode === 'discord' ? 'Connecting...' : 'Connect Discord'}
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
