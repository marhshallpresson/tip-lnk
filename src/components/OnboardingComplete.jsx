import { useApp } from '../contexts/AppContext';
import { PartyPopper, ArrowRight, Zap, Share2, QrCode, TrendingUp } from 'lucide-react';

export default function OnboardingComplete({ onFinish }) {
  const { profile } = useApp();

  return (
    <div className="glass-card glow-brand p-8 sm:p-10 max-w-lg mx-auto text-center animate-slide-up">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-green/30 to-accent-green/10 flex items-center justify-center mx-auto mb-6">
        <PartyPopper size={36} className="text-accent-green" />
      </div>

      <h2 className="text-3xl font-bold mb-3">Welcome to <span className="text-brand-400">TipLnk</span></h2>
      <p className="text-surface-400 mb-8 text-sm leading-relaxed">
        Your creator profile is live on Solana. Your tip page is ready to share.
      </p>

      {/* Profile summary */}
      <div className="bg-surface-800/50 rounded-xl p-5 mb-6 space-y-3 text-left">
        <div className="flex justify-between items-center">
          <span className="text-surface-500 text-sm">Avatar</span>
          <span className="font-medium text-sm">{profile.nftAvatar?.name || 'Default'}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-surface-500 text-sm">Domain</span>
          <span className="font-medium text-sm text-brand-400">{profile.solDomain || 'Not registered'}</span>
        </div>
        {profile.nftAvatar?.isDoodle && (
          <div className="flex justify-between items-center">
            <span className="text-surface-500 text-sm">Status</span>
            <span className="badge-brand">★ Doodles Holder</span>
          </div>
        )}
      </div>

      {/* What's next */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-surface-900/40">
          <Share2 size={16} className="text-brand-400" />
          <span className="text-surface-400 text-xs">Share Link</span>
        </div>
        <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-surface-900/40">
          <QrCode size={16} className="text-accent-cyan" />
          <span className="text-surface-400 text-xs">QR Code</span>
        </div>
        <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-surface-900/40">
          <TrendingUp size={16} className="text-accent-purple" />
          <span className="text-surface-400 text-xs">Kamino Yield</span>
        </div>
      </div>

      <button onClick={onFinish} className="btn-primary flex items-center gap-2 mx-auto group">
        <Zap size={16} />
        Launch Dashboard
        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
}
