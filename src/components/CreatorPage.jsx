import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import TipWidget from './TipWidget';
import {
  Zap,
  Twitter,
  Globe,
  Share2,
  Users,
  Heart,
  Star,
  MessageCircle,
  Trophy,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

/**
 * Public Creator Page
 * Real-time tipping portal for fans and supporters.
 */
export default function CreatorPage() {
  const { username } = useParams();
  const { profile, tipsReceived, totalTipsUSDC } = useApp();

  const supporterCount = useMemo(() => {
    const unique = new Set(tipsReceived.map(t => t.sender));
    return unique.size;
  }, [tipsReceived]);

  const progress = Math.min((totalTipsUSDC / 5000) * 100, 100);

  return (
    <div className="min-h-screen bg-main-bg text-white font-sans">
      {/* Professional Banner */}
      <div className="h-64 w-full relative bg-busha-green overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,rgba(0,210,101,0.3)_0%,transparent_100%)]" />
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-main-bg/80" />
      </div>

      <div className="max-w-[1200px] mx-auto px-6 relative mt-[-100px]">
        <div className="flex flex-col lg:flex-row gap-12">

          {/* Main Content */}
          <div className="flex-1 space-y-8 pb-20">
            <div className="flex flex-col md:flex-row gap-6 items-end">
              <div className="w-32 h-32 rounded-[32px] bg-surface-900 border-4 border-main-bg overflow-hidden shadow-2xl shrink-0">
                {profile.nftAvatar?.image ? (
                  <img src={profile.nftAvatar.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-surface-800 flex items-center justify-center">
                    <Users size={40} className="text-surface-700" />
                  </div>
                )}
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-4xl font-black text-white">{profile.solDomain || profile.displayName || username}</h1>
                  {profile.solDomain && <span className="badge-brand">SNS</span>}
                  <ShieldCheck size={24} className="text-brand-500" />
                </div>
                <p className="text-surface-500 font-bold">Artist & Solana Creator</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <MetricCard label="Supporters" value={supporterCount} />
              <MetricCard label="Total Tips" value={tipsReceived.length} />
              <MetricCard label="Goal" value={`${progress.toFixed(0)}%`} color="text-brand-500" />
              <MetricCard label="Network" value="Solana" />
            </div>

            <div className="glass-card p-8">
              <h2 className="text-2xl font-black mb-6">About</h2>
              <p className="text-surface-400 leading-relaxed text-lg">
                Verified creator on the TipLnk network. Supporting the future of decentralized finance and digital ownership on Solana.
              </p>
            </div>

            {/* Wall of Love */}
            <div>
              <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
                <Heart size={24} className="text-accent-red" /> Wall of Love
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tipsReceived.length === 0 ? (
                  <div className="md:col-span-2 py-16 bg-surface-900 border border-surface-800 rounded-[24px] text-center">
                    <Heart size={40} className="text-surface-800 mx-auto mb-4" />
                    <p className="text-surface-500 font-bold uppercase tracking-widest text-xs">Be the first to tip</p>
                  </div>
                ) : (
                  tipsReceived.map((tip, i) => (
                    <div key={i} className="bg-surface-900 border border-surface-800 p-6 rounded-[24px] hover:border-surface-700 transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-surface-800 flex items-center justify-center font-black text-xs text-surface-500">
                            {tip.sender[0]}
                          </div>
                          <p className="font-bold text-white">{tip.sender}</p>
                        </div>
                        <span className="text-brand-500 font-black text-sm">+${tip.amountUSDC.toFixed(2)}</span>
                      </div>
                      <p className="text-surface-500 text-sm italic font-medium">Verified Tip via {tip.inputToken}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sticky Side Widget */}
          <div className="w-full lg:w-[420px] shrink-0">
            <div className="sticky top-24">
              <TipWidget />

              <div className="mt-6 bg-brand-500/5 border border-brand-500/10 rounded-[24px] p-6 text-center">
                <Star size={24} className="text-brand-500 mx-auto mb-3" />
                <h3 className="font-bold text-white mb-2">Exclusive Memberships</h3>
                <p className="text-sm text-surface-500 mb-6 px-4 leading-relaxed">Join the inner circle and unlock unique on-chain rewards and direct access.</p>
                <button className="w-full btn-secondary !text-xs opacity-50 cursor-not-allowed">Coming Soon</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color = "text-white" }) {
  return (
    <div className="bg-surface-900 border border-surface-800 p-6 rounded-[24px] text-center">
      <p className={`font-bold text-2xl mb-1 ${color}`}>{value}</p>
      <p className="text-[10px] font-black text-surface-500 uppercase tracking-widest">{label}</p>
    </div>
  );
}
