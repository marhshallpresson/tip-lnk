import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getProfile } from '../utils/database';
import TipWidget from './TipWidget';
import {
  Globe,
  Loader2,
  Heart,
  MessageSquare,
  Repeat,
  Image as ImageIcon,
  ShieldCheck,
  Share2,
  Twitter,
  User,
  TrendingUp,
  Award,
  Clock,
  ExternalLink,
  ChevronRight,
  Coffee
} from 'lucide-react';

export default function CreatorPage() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('about');

  useEffect(() => {
    const fetchCreator = async () => {
      setLoading(true);
      try {
        const data = await getProfile(username);
        setProfile(data);
      } catch (err) {
        console.error('Failed to load creator profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCreator();
  }, [username]);

  const tipsReceived = profile?.tipsReceived || [];
  const supporterCount = useMemo(() => new Set(tipsReceived.map(t => t.sender)).size, [tipsReceived]);
  const totalVolume = useMemo(() => tipsReceived.reduce((sum, t) => sum + (t.amountUSDC || 0), 0), [tipsReceived]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={40} className="text-brand-500 animate-spin" />
          <p className="text-surface-500 font-bold uppercase tracking-widest text-xs">Loading Identity...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center text-center p-6">
        <div className="max-w-md">
          <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mx-auto mb-6">
            <User size={40} className="text-white/20" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Profile Not Found</h2>
          <p className="text-surface-400 mb-8 leading-relaxed">The creator <span className="text-brand-400 font-mono">@{username}</span> hasn't claimed their handle yet or the address is invalid.</p>
          <a href="/" className="btn-primary w-full text-center">Claim this handle</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-950 text-white font-sans selection:bg-brand-500 selection:text-black pb-20">
      <CreatorHeader profile={profile} supporterCount={supporterCount} totalVolume={totalVolume} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-12">

          {/* Main Content Area */}
          <div className="flex-1 order-2 lg:order-1 space-y-12">
            <div className="bg-surface-900/40 border border-surface-800 rounded-[32px] overflow-hidden shadow-2xl">
              <CreatorTabs activeTab={activeTab} setActiveTab={setActiveTab} />
              <div className="p-8 sm:p-12">
                <TabContent activeTab={activeTab} profile={profile} tipsReceived={tipsReceived} />
              </div>
            </div>

            {/* Featured Section - Membership & Goals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-card p-8 border-brand-500/10 group hover:border-brand-500/30 transition-all flex flex-col">
                <Award className="text-brand-500 mb-4" size={24} />
                <h4 className="font-bold text-lg mb-2 text-white">Supporter Tiers</h4>
                <p className="text-surface-400 text-sm leading-relaxed mb-6">Support my journey and get exclusive perks, early access, and Discord roles.</p>
                <div className="mt-auto">
                  <button className="text-brand-500 text-xs font-black uppercase tracking-widest flex items-center gap-2 group-hover:gap-3 transition-all">
                    View Membership <ChevronRight size={14} />
                  </button>
                </div>
              </div>
              <div className="glass-card p-8 border-emerald-500/10 group hover:border-emerald-500/30 transition-all">
                <TrendingUp className="text-emerald-500 mb-4" size={24} />
                <h4 className="font-bold text-lg mb-2 text-white">Active Goal</h4>
                <p className="text-surface-400 text-sm leading-relaxed mb-6">Raising for improved streaming hardware and a new series of Web3 tutorials.</p>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[65%] shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                </div>
                <div className="flex justify-between mt-3">
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">65% of $5,000</span>
                  <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">$3,250 reached</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Sidebar */}
          <div className="lg:w-[420px] shrink-0 order-1 lg:order-2">
            <div className="sticky top-28 space-y-8">
              <div id="tip-widget" className="animate-slide-up">
                <TipWidget fixedRecipient={{
                  username: profile.solDomain || profile.displayName || profile.walletAddress.slice(0, 8),
                  address: profile.walletAddress
                }} />
              </div>

              <div className="glass-card p-8 animate-slide-up" style={{ animationDelay: '100ms' }}>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 flex items-center gap-2">
                    <TrendingUp size={14} className="text-brand-500" /> Recent Supporters
                  </h2>
                  <span className="text-[10px] font-bold text-brand-500 bg-brand-500/10 px-2 py-0.5 rounded-full">{supporterCount}</span>
                </div>
                <SupporterFeed tips={tipsReceived} />
              </div>
            </div>
          </div>

        </div>
      </main>

      <footer className="py-20 border-t border-white/5 text-center mt-20">
        <img src="/logo.svg" className="h-6 mx-auto mb-6 opacity-20 grayscale" alt="TipLnk" />
        <p className="text-surface-600 text-[10px] font-bold uppercase tracking-[0.4em]">Powered by TipLnk Protocol • Decentralized Support</p>
      </footer>
    </div>
  );
}

const CreatorHeader = ({ profile, supporterCount, totalVolume }) => {
  const displayName = profile.displayName || profile.name || 'Anonymous Creator';
  const avatarFallback = profile.walletAddress ? profile.walletAddress.slice(0, 2).toUpperCase() : '?';

  return (
    <div className="relative">
      {/* Cover Image - Large Hero Style */}
      <div className="h-64 md:h-96 w-full bg-surface-900 border-b border-white/5 relative overflow-hidden">
        {profile.coverImageUrl ? (
          <img
            src={profile.coverImageUrl}
            alt="Cover"
            className="w-full h-full object-cover animate-fade-in"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-brand-600/10 via-surface-900 to-surface-950 flex items-center justify-center">
            <img src="/logo.svg" className="w-1/3 opacity-[0.03] blur-3xl scale-150 rotate-12" alt="" />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-transparent to-transparent opacity-80" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center relative mt-[-64px] md:mt-[-80px]">

          {/* Avatar - Large & Centered like competitors */}
          <div className="relative group mb-6">
            <div className="w-32 h-32 md:w-48 md:h-44 rounded-[48px] bg-surface-900 border-[10px] border-surface-950 overflow-hidden shadow-2xl transition-all duration-700 group-hover:rounded-[32px] group-hover:rotate-1">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover animate-fade-in"
                  onError={(e) => { e.target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center text-5xl font-black text-white/10 bg-surface-800">${avatarFallback}</div>`; }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl font-black text-white/10 bg-surface-800">
                  {avatarFallback}
                </div>
              )}
            </div>
            {profile.walletAddress && (
              <div className="absolute bottom-2 right-2 w-12 h-12 rounded-2xl bg-brand-500 text-black flex items-center justify-center shadow-2xl border-4 border-surface-950 animate-bounce-slow" title="Verified Creator">
                <ShieldCheck size={24} />
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="max-w-3xl px-4">
            <div className="flex flex-col items-center gap-2 mb-4">
              <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white mb-2">{profile.solDomain || displayName}</h1>
              <div className="flex items-center gap-3">
                {profile.twitterHandle && (
                  <a
                    href={`https://x.com/${profile.twitterHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/[0.03] border border-white/5 text-sky-400 hover:bg-sky-500/10 transition-all"
                  >
                    <Twitter size={14} fill="currentColor" />
                    <span className="text-xs font-bold tracking-tight">@{profile.twitterHandle}</span>
                  </a>
                )}
                <div className="flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 px-4 py-2 rounded-2xl">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                  <p className="text-xs font-bold text-brand-500 uppercase tracking-wider">{supporterCount} Supporters</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-center gap-4 mt-10">
              <button
                onClick={() => {
                  const el = document.getElementById('tip-widget');
                  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="h-14 px-10 rounded-2xl bg-brand-500 text-black font-black uppercase tracking-widest text-xs hover:bg-white transition-all hover:scale-105 active:scale-95 shadow-xl shadow-brand-500/20 flex items-center gap-3"
              >
                <img src="/favicon.svg" alt="TipLnk" className="w-6 h-6" />
                Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CreatorTabs = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'about', label: 'About', icon: User },
    { id: 'posts', label: 'Feed', icon: MessageSquare },
    { id: 'gallery', label: 'Gallery', icon: ImageIcon }
  ];

  return (
    <div className="bg-surface-800/20 px-8 border-b border-white/5">
      <nav className="flex justify-center sm:justify-start space-x-12" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap py-8 px-1 border-b-4 font-black text-[10px] uppercase tracking-[0.3em] transition-all relative ${activeTab === tab.id
                ? 'border-brand-500 text-brand-500'
                : 'border-transparent text-surface-500 hover:text-white'
              }`}
          >
            <div className="flex items-center gap-2.5">
              <tab.icon size={14} />
              {tab.label}
            </div>
            {activeTab === tab.id && (
              <div className="absolute bottom-[-4px] left-0 right-0 h-4 bg-brand-500/10 blur-xl" />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};

const TabContent = ({ activeTab, profile }) => {
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  useEffect(() => {
    const fetchPosts = async () => {
      if (activeTab !== 'posts' || !profile?.twitterHandle) return;
      setLoadingPosts(true);
      try {
        const isProd = import.meta.env.PROD;
        const API_BASE = isProd ? window.location.origin : (import.meta.env.VITE_API_BASE_URL || '');
        const res = await fetch(`${API_BASE}/api/social/x-posts/${profile.twitterHandle}`);
        if (res.ok) {
          const data = await res.json();
          setPosts(data);
        } else {
          setPosts([]);
        }
      } catch (err) {
        console.error('Failed to fetch posts', err);
      } finally {
        setLoadingPosts(false);
      }
    };
    fetchPosts();
  }, [activeTab, profile?.twitterHandle]);

  if (activeTab === 'about') {
    return (
      <div className="animate-fade-in space-y-16">
        <div className="space-y-8">
          <h3 className="text-2xl font-black flex items-center gap-4 text-white">
            <Coffee size={24} className="text-brand-500" />
            The Story
          </h3>
          {profile.bio ? (
            <p className="text-xl text-surface-300 leading-relaxed font-medium max-w-4xl">
              {profile.bio}
            </p>
          ) : (
            <div className="p-12 rounded-[40px] bg-white/[0.02] border border-dashed border-white/10 text-center">
              <p className="italic text-white/20 font-medium">Sharing my creative journey on the blockchain.</p>
            </div>
          )}
        </div>

        <div className="space-y-8 pt-16 border-t border-white/5">
          <h3 className="text-lg font-black uppercase tracking-widest text-white/30">Verified Links</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {profile.twitterHandle && (
              <a href={`https://x.com/${profile.twitterHandle}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-6 p-6 rounded-[32px] bg-white/[0.03] border border-white/5 text-white/80 hover:bg-brand-500/10 hover:border-brand-500/30 transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-400">
                  <Twitter size={28} fill="currentColor" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/20 block mb-1">X Timeline</span>
                  <span className="font-bold text-xl">@{profile.twitterHandle}</span>
                </div>
              </a>
            )}
            {profile.link && (
              <a href={profile.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-6 p-6 rounded-[32px] bg-white/[0.03] border border-white/5 text-white/80 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <Globe size={28} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/20 block mb-1">Official Website</span>
                  <span className="font-bold text-xl">{profile.link.replace(/^https?:\/\//, '')}</span>
                </div>
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'posts') {
    if (!profile?.twitterHandle) {
      return (
        <div className="py-24 bg-white/[0.02] border border-dashed border-white/10 rounded-[48px] text-center">
          <Twitter size={64} className="text-white/5 mx-auto mb-6" />
          <h4 className="text-2xl font-bold text-white mb-2">No Feed Connected</h4>
          <p className="text-surface-500 text-sm max-w-xs mx-auto">This creator hasn't linked their X (Twitter) account yet.</p>
        </div>
      );
    }
    if (loadingPosts) {
      return (
        <div className="py-24 text-center">
          <Loader2 size={40} className="animate-spin text-brand-500 mx-auto mb-4" />
          <p className="text-surface-500 font-bold uppercase tracking-widest text-xs">Fetching Live Feed...</p>
        </div>
      );
    }
    if (!posts?.data?.length) {
      return (
        <div className="py-24 bg-white/[0.02] border border-dashed border-white/10 rounded-[48px] text-center">
          <MessageSquare size={64} className="text-white/5 mx-auto mb-6" />
          <h4 className="text-2xl font-bold text-white mb-2">Empty Feed</h4>
          <p className="text-surface-500 text-sm max-w-xs mx-auto">This creator hasn't posted anything on X yet. Check back soon!</p>
        </div>
      );
    }
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center justify-between mb-4 px-2">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 flex items-center gap-2">
            <Twitter size={14} className="text-sky-400" fill="currentColor" /> Live X Timeline
          </h3>
          <span className="text-[10px] font-bold text-sky-400 bg-sky-400/10 px-2 py-0.5 rounded-full">LIVE</span>
        </div>
        {posts.data.map(post => <PostCard key={post.id} post={post} profile={profile} />)}
      </div>
    );
  }

  return (
    <div className="py-24 bg-white/[0.02] border border-dashed border-white/10 rounded-[48px] text-center">
      <ImageIcon size={64} className="text-white/5 mx-auto mb-6" />
      <h4 className="text-2xl font-bold text-white mb-2">Digital Gallery</h4>
      <p className="text-surface-500 text-sm max-w-xs mx-auto">NFT collections and creative assets will be showcased here in our next update.</p>
    </div>
  );
};

const PostCard = ({ post, profile }) => {
  const avatarFallback = profile.displayName ? profile.displayName[0].toUpperCase() : 'C';
  return (
    <div className="bg-surface-900 border border-white/5 p-8 sm:p-10 rounded-[48px] hover:border-brand-500/20 transition-all shadow-xl group">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-surface-800 overflow-hidden ring-4 ring-white/5 group-hover:ring-brand-500/20 transition-all">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.displayName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-black text-white/20">{avatarFallback}</div>
          )}
        </div>
        <div>
          <p className="font-bold text-xl text-white leading-none mb-1">{profile.displayName}</p>
          <span className="text-xs font-bold text-white/20 uppercase tracking-widest">
            {new Date(post.created_at).toLocaleDateString()}
          </span>
        </div>
        <div className="ml-auto">
          <Twitter size={20} className="text-white/10 group-hover:text-sky-500/40 transition-colors" fill="currentColor" />
        </div>
      </div>
      <p className="text-surface-200 text-xl leading-relaxed whitespace-pre-wrap mb-10 font-medium">{post.text}</p>
      <div className="flex items-center gap-10 text-white/40 text-xs font-black uppercase tracking-[0.2em]">
        <div className="flex items-center gap-2.5 hover:text-red-500 transition-colors cursor-pointer"><Heart size={18} /> {post.public_metrics.like_count}</div>
        <div className="flex items-center gap-2.5 hover:text-brand-500 transition-colors cursor-pointer"><Repeat size={18} /> {post.public_metrics.retweet_count}</div>
        <div className="flex items-center gap-2.5 hover:text-sky-500 transition-colors cursor-pointer"><MessageSquare size={18} /> {post.public_metrics.reply_count}</div>
        <button className="ml-auto p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white/60 transition-all">
          <Share2 size={18} />
        </button>
      </div>
    </div>
  );
};

const SupporterFeed = ({ tips }) => {
  if (tips.length === 0) {
    return (
      <div className="py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/5">
          <Heart size={28} className="text-white/10" />
        </div>
        <p className="text-xs text-white/20 font-black uppercase tracking-[0.3em]">Be the first supporter!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {tips.slice(0, 8).map((tip, i) => (
          <div key={i} className="flex items-start gap-4 p-5 rounded-[28px] bg-white/[0.02] border border-white/5 hover:border-brand-500/20 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-900 flex items-center justify-center text-sm text-white font-black shadow-lg shrink-0">
              {tip.sender_name ? tip.sender_name[0].toUpperCase() : 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-black text-white truncate pr-2">{tip.sender_name || 'Anonymous'}</p>
                <span className="text-[10px] font-black text-brand-500 bg-brand-500/10 px-2 py-0.5 rounded-lg shrink-0">${parseFloat(tip.amountUSDC).toFixed(2)}</span>
              </div>
              {tip.message && (
                <p className="text-sm text-white/50 mb-2 leading-relaxed italic">"{tip.message}"</p>
              )}
              <div className="flex items-center gap-2">
                <Clock size={10} className="text-white/20" />
                <span className="text-[9px] font-bold text-white/20 uppercase">{new Date(tip.timestamp).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button className="w-full py-4 text-[10px] font-black uppercase tracking-[0.3em] text-white/30 hover:text-white transition-colors border-t border-white/5 pt-8 mt-6">
        Explore All Activity
      </button>
    </div>
  );
};

