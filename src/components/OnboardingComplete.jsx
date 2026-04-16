import { useApp } from '../contexts/AppContext';
import { PartyPopper, ArrowRight, Zap, Share2, QrCode, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

export default function OnboardingComplete({ onFinish, onBack }) {
  const { profile } = useApp();

  return (
    <div className="glass-card glow-brand p-8 sm:p-10 max-w-lg mx-auto animate-slide-up">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-surface-800 text-surface-400 hover:text-white transition-all"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-left flex-1 pr-10">
          <h2 className="text-3xl font-bold">You're <span className="text-brand-400">Ready!</span></h2>
          <p className="text-surface-400 text-sm italic">
            Your creator profile is live on Solana.
          </p>
        </div>
      </div>

      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-green/30 to-accent-green/10 flex items-center justify-center mx-auto mb-6">
        <PartyPopper size={36} className="text-accent-green" />
      </div>

      {/* Profile summary — real data only */}
      <div className="bg-surface-800/50 rounded-xl p-5 mb-6 space-y-3 text-left">
        {profile.avatarUrl && (
          <div className="flex justify-between items-center">
            <span className="text-surface-500 text-sm">Avatar</span>
            <span className="font-medium text-sm capitalize">{profile.avatarType || 'Custom'}</span>
          </div>
        )}
        {profile.solDomain && (
          <div className="flex justify-between items-center">
            <span className="text-surface-500 text-sm">Domain</span>
            <span className="font-medium text-sm text-brand-400">{profile.solDomain}</span>
          </div>
        )}
        {profile.bio && (
          <div className="flex justify-between items-start">
            <span className="text-surface-500 text-sm">Bio</span>
            <span className="font-medium text-sm text-right max-w-[200px] truncate">{profile.bio}</span>
          </div>
        )}
        {profile.roleTitle && (
          <div className="flex justify-between items-center">
            <span className="text-surface-500 text-sm">Role</span>
            <span className="font-medium text-sm">{profile.roleTitle}</span>
          </div>
        )}
        {profile.socials?.isTwitterVerified && (
          <div className="flex justify-between items-center">
            <span className="text-surface-500 text-sm">X (Twitter)</span>
            <span className="flex items-center gap-1 text-sm text-brand-400"><CheckCircle2 size={12} /> Verified</span>
          </div>
        )}
        {profile.socials?.isDiscordVerified && (
          <div className="flex justify-between items-center">
            <span className="text-surface-500 text-sm">Discord</span>
            <span className="flex items-center gap-1 text-sm text-brand-400"><CheckCircle2 size={12} /> Verified</span>
          </div>
        )}
        {!profile.avatarUrl && !profile.solDomain && !profile.bio && !profile.roleTitle && (
          <div className="flex justify-between items-center">
            <span className="text-surface-500 text-sm">Network</span>
            <span className="text-xs font-mono bg-surface-700 px-2 py-1 rounded">Mainnet-Beta</span>
          </div>
        )}
      </div>

      {/* What's next */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-surface-900/40">
          <Share2 size={16} className="text-brand-400" />
          <span className="text-surface-400 text-[10px] uppercase font-bold">Share Link</span>
        </div>
        <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-surface-900/40">
          <QrCode size={16} className="text-accent-cyan" />
          <span className="text-surface-400 text-[10px] uppercase font-bold">QR Code</span>
        </div>
        <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-surface-900/40">
          <Zap size={16} className="text-accent-green" />
          <span className="text-surface-400 text-[10px] uppercase font-bold">Earn Tips</span>
        </div>
      </div>

      <div className="flex justify-between items-center pt-8 border-t border-surface-800 mt-4">
        <button
          onClick={onBack}
          className="text-surface-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest"
        >
          Previous
        </button>
        <button
          onClick={onFinish}
          className="btn-primary flex items-center gap-2 group shadow-xl shadow-brand-500/10"
        >
          <Zap size={16} />
          Launch Dashboard
          <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
