import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { getProfile } from '../utils/database';
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
  ShieldCheck,
  Loader2
} from 'lucide-react';

/**
 * Public Creator Page
 * Real-time tipping portal for fans and supporters.
 */
export default function CreatorPage() {
  const { username } = useParams();
  const location = useLocation();
  const [creatorProfile, setCreatorProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const query = new URLSearchParams(location.search);
  const isEmbed = query.get('embed') === 'true';
  const theme = query.get('theme') || 'dark';
  const accent = query.get('accent') || '#00D265';

  useEffect(() => {
    const fetchCreator = async () => {
      setLoading(true);
      try {
        const data = await getProfile(username);
        setCreatorProfile(data);
      } catch (err) {
        console.error('Failed to load creator profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCreator();
  }, [username]);

  const tipsReceived = creatorProfile?.tipsReceived || [];
  const totalTipsUSDC = creatorProfile?.totalTipsUSDC || 0;
  const displayName = creatorProfile?.displayName || username;
  const solDomain = creatorProfile?.solDomain || null;
  const walletAddress = creatorProfile?.walletAddress || null;
  const roleTitle = creatorProfile?.roleTitle || null;
  const bio = creatorProfile?.bio || null;
  const avatarUrl = creatorProfile?.avatarUrl || null;
  const socials = creatorProfile?.socials || {};

  const supporterCount = useMemo(() => {
    const unique = new Set(tipsReceived.map(t => t.sender));
    return unique.size;
  }, [tipsReceived]);

  const progress = Math.min((totalTipsUSDC / 5000) * 100, 100);

  if (loading) {
    return (
      <div className="min-h-screen bg-main-bg flex items-center justify-center">
        <Loader2 size={32} className="text-brand-500 animate-spin" />
      </div>
    );
  }

  if (isEmbed) {
    return (
      <div className={`min-h-screen ${theme === 'light' ? 'bg-white text-black' : 'bg-main-bg text-white'} p-4 flex flex-col items-center justify-center font-sans`}>
        <TipWidget fixedRecipient={{
          username: solDomain || displayName,
          address: walletAddress
        }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-main-bg text-white font-sans">
      {/* Banner */}
      <div className="h-48 w-full relative bg-busha-green overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,rgba(0,210,101,0.3)_0%,transparent_100%)]" />
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-main-bg/80" />
      </div>

      <div className="max-w-[1200px] mx-auto px-6 relative mt-[-80px]">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Main Content */}
          <div className="flex-1 space-y-8 pb-20">
            <div className="flex flex-col md:flex-row gap-6 items-end">
              <div className="w-32 h-32 rounded-[32px] bg-surface-900 border-4 border-main-bg overflow-hidden shadow-2xl shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-surface-800 flex items-center justify-center">
                    <Users size={40} className="text-surface-700" />
                  </div>
                )}
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl font-black text-white">{solDomain || displayName}</h1>
                  {solDomain && <span className="badge-brand">SNS</span>}
                  {socials.isTwitterVerified && <ShieldCheck size={20} className="text-brand-500" />}
                </div>
                {roleTitle && (
                  <p className="text-surface-400 font-bold">{roleTitle}</p>
                )}
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <MetricCard label="Supporters" value={supporterCount} />
              <MetricCard label="Total Tips" value={tipsReceived.length} />
              <MetricCard label="Goal" value={`${progress.toFixed(0)}%`} color="text-brand-500" />
            </div>

            {/* Bio / About */}
            {bio && (
              <div className="glass-card p-6">
                <h2 className="text-xl font-black mb-4">About</h2>
                <p className="text-surface-400 leading-relaxed text-base">{bio}</p>
              </div>
            )}

            {/* Social Links */}
            {(socials.twitter || socials.discord) && (
              <div className="glass-card p-6">
                <h2 className="text-xl font-black mb-4">Socials</h2>
                <div className="flex gap-4">
                  {socials.twitter && (
                    <a
                      href={`https://x.com/${socials.twitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1DA1F2]/10 text-[#1DA1F2] hover:bg-[#1DA1F2]/20 transition-colors"
                    >
                      <Twitter size={16} />
                      @{socials.twitter}
                    </a>
                  )}
                  {socials.discord && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5865F2]/10 text-[#5865F2]">
                      <Twitter size={16} />
                      {socials.discord}
                    </div>
                  )}
                </div>
              </div>
            )}

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
              <TipWidget fixedRecipient={{
                username: solDomain || displayName,
                address: walletAddress
              }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color = "text-white" }) {
  return (
    <div className="bg-surface-900 border border-surface-800 p-4 rounded-[24px] text-center">
      <p className={`font-bold text-xl mb-1 ${color}`}>{value}</p>
      <p className="text-[10px] font-black text-surface-500 uppercase tracking-widest">{label}</p>
    </div>
  );
}
