import { useApp } from '../contexts/AppContext';
import { PartyPopper, ArrowRight, Zap, Share2, QrCode, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

export default function OnboardingComplete({ onFinish, onBack }) {
  const { profile } = useApp();

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
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">You're <span className="text-brand-500">Ready!</span></h2>
          <p className="text-white/40 text-sm md:text-base italic">
            Your creator profile is live on Solana.
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 rounded-[24px] bg-brand-500/20 flex items-center justify-center mb-6 relative">
          <PartyPopper size={36} className="text-brand-500" />
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-brand-500 rounded-full flex items-center justify-center text-black shadow-lg">
             <CheckCircle2 size={14} strokeWidth={3} />
          </div>
        </div>
      </div>

      {/* Profile summary — real data only */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 space-y-4 text-left">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Profile Summary</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {profile.solDomain && (
            <div className="flex flex-col gap-1">
              <span className="text-white/30 text-[10px] uppercase font-bold tracking-wider">Handle</span>
              <span className="font-bold text-sm text-brand-400">{profile.solDomain}</span>
            </div>
          )}
          {profile.roleTitle && (
            <div className="flex flex-col gap-1">
              <span className="text-white/30 text-[10px] uppercase font-bold tracking-wider">Identity</span>
              <span className="font-bold text-sm text-white">{profile.roleTitle}</span>
            </div>
          )}
          {profile.socials?.isTwitterVerified && (
            <div className="flex flex-col gap-1">
              <span className="text-white/30 text-[10px] uppercase font-bold tracking-wider">X (Twitter)</span>
              <span className="flex items-center gap-1 text-sm text-brand-400 font-bold"><CheckCircle2 size={12} /> Verified</span>
            </div>
          )}
          {profile.socials?.isDiscordVerified && (
            <div className="flex flex-col gap-1">
              <span className="text-white/30 text-[10px] uppercase font-bold tracking-wider">Discord</span>
              <span className="flex items-center gap-1 text-sm text-brand-400 font-bold"><CheckCircle2 size={12} /> Verified</span>
            </div>
          )}
        </div>
      </div>

      {/* What's next */}
      <div className="grid grid-cols-3 gap-3 mb-10">
        <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/5 transition-all hover:bg-white/10">
          <Share2 size={18} className="text-brand-500" />
          <span className="text-white/40 text-[9px] uppercase font-black tracking-tighter">Share Link</span>
        </div>
        <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/5 transition-all hover:bg-white/10">
          <QrCode size={18} className="text-brand-500" />
          <span className="text-white/40 text-[9px] uppercase font-black tracking-tighter">QR Code</span>
        </div>
        <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/5 transition-all hover:bg-white/10">
          <Zap size={18} className="text-brand-500" />
          <span className="text-white/40 text-[9px] uppercase font-black tracking-tighter">Earn Tips</span>
        </div>
      </div>

      <div className="pt-8 border-t border-white/5">
        <button
          onClick={onFinish}
          className="btn-primary w-full py-5 rounded-2xl text-xl font-black group shadow-2xl shadow-brand-500/20 flex items-center justify-center gap-3"
        >
          <Zap size={24} fill="currentColor" />
          Launch Dashboard
          <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
