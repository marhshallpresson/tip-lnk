import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { getProfile } from '../utils/database';
import TipWidget from './TipWidget';
import WhiteLabelNav from './WhiteLabelNav';
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
  
  // Extract profile-specific fields from the nested profile object
  const profile = creatorProfile?.profile || {};
  const displayName = profile.displayName || username;
  const solDomain = profile.solDomain || null;
  const walletAddress = creatorProfile?.walletAddress || profile.walletAddress || null;
  const roleTitle = profile.roleTitle || null;
  const bio = profile.bio || null;
  const avatarUrl = profile.avatarUrl || null;
  const socials = profile.socials || {};

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
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      {!isEmbed && <WhiteLabelNav creatorName={solDomain || displayName} />}
      
      {/* Banner */}
      <div className={`h-40 w-full relative bg-[#111111] border-b border-white/5 ${!isEmbed ? 'mt-16' : ''}`}>
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      </div>

      <div className="max-w-[1100px] mx-auto px-6 relative mt-[-60px]">
        <div className="flex flex-col lg:flex-row gap-12">

          {/* Main Content */}
          <div className="flex-1 space-y-10 pb-24">
            <div className="flex flex-col md:flex-row gap-6 items-end">
              <div className="w-28 h-28 rounded-2xl bg-[#111111] border-4 border-[#0a0a0a] overflow-hidden shadow-2xl shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#1a1a1a] flex items-center justify-center">
                    <Users size={32} className="text-white/10" />
                  </div>
                )}
              </div>
              <div className="flex-1 pb-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold tracking-tight text-white">{solDomain || displayName}</h1>
                  {solDomain && <span className="badge badge-brand">SNS Verified</span>}
                  {socials.isTwitterVerified && <ShieldCheck size={20} className="text-brand-500" />}
                </div>
                {roleTitle && (
                  <p className="text-white/40 font-medium text-sm">{roleTitle}</p>
                )}
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-4">
              <MetricCard label="Supporters" value={supporterCount} />
              <MetricCard label="Tips" value={tipsReceived.length} />
              <MetricCard label="Goal" value={`${progress.toFixed(0)}%`} color="text-brand-500" />
            </div>

            {/* Bio / About */}
            {bio && (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-white/20">About</h2>
                <p className="text-white/60 leading-relaxed text-base">{bio}</p>
              </div>
            )}

            {/* Social Links */}
            {(socials.twitter || socials.discord) && (
              <div className="space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-white/20">Socials</h2>
                <div className="flex flex-wrap gap-3">
                  {socials.twitter && (
                    <a
                      href={`https://x.com/${socials.twitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/5 text-white/80 hover:bg-white/10 transition-colors text-sm font-medium"
                    >
                      <Twitter size={16} className="text-[#1DA1F2]" />
                      @{socials.twitter}
                    </a>
                  )}
                  {socials.discord && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/5 text-white/80 text-sm font-medium">
                      <MessageCircle size={16} className="text-[#5865F2]" />
                      {socials.discord}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Wall of Love */}
            <div className="space-y-8">
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-3">
                <Heart size={20} className="text-red-500" /> Wall of Love
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tipsReceived.length === 0 ? (
                  <div className="md:col-span-2 py-16 bg-[#111111] border border-white/5 rounded-xl text-center">
                    <Heart size={32} className="text-white/5 mx-auto mb-4" />
                    <p className="text-white/20 font-semibold uppercase tracking-wider text-[10px]">Be the first to support</p>
                  </div>
                ) : (
                  tipsReceived.map((tip, i) => (
                    <div key={i} className="bg-[#111111] border border-white/5 p-6 rounded-xl hover:border-white/10 transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center font-bold text-[10px] text-white/40">
                            {tip.sender[0]}
                          </div>
                          <p className="font-semibold text-white text-sm">{tip.sender}</p>
                        </div>
                        <span className="text-brand-500 font-bold text-sm">+${tip.amountUSDC.toFixed(2)}</span>
                      </div>
                      <p className="text-white/40 text-[10px] uppercase font-semibold tracking-wider">Verified Transfer • {tip.inputToken}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sticky Side Widget */}
          <div className="w-full lg:w-[400px] shrink-0">
            <div className="sticky top-28">
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
    <div className="stat-card flex flex-col items-center justify-center text-center p-4">
      <p className={`font-bold text-xl mb-1 tracking-tight ${color}`}>{value}</p>
      <p className="text-[10px] font-semibold text-white/20 uppercase tracking-wider">{label}</p>
    </div>
  );
}
