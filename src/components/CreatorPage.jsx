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
  Zap,
  TrendingUp,
  Award,
  Clock,
  ExternalLink,
  ChevronRight
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
          <a href="/" className="btn-primary w-full">Claim this handle</a>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-surface-950 text-white font-sans selection:bg-brand-500 selection:text-black">
      <CreatorHeader profile={profile} supporterCount={supporterCount} totalVolume={totalVolume} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* Main Content Area */}
          <div className="flex-1 space-y-12">
            <div className="bg-surface-900/40 border border-surface-800 rounded-[32px] overflow-hidden shadow-2xl">
                <CreatorTabs activeTab={activeTab} setActiveTab={setActiveTab} />
                <div className="p-8 sm:p-12">
                    <TabContent activeTab={activeTab} profile={profile} tipsReceived={tipsReceived} />
                </div>
            </div>

            {/* Featured Section - Like BMAC */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="glass-card p-8 border-brand-500/10 group hover:border-brand-500/30 transition-all">
                  <Award className="text-brand-500 mb-4" size={24} />
                  <h4 className="font-bold text-lg mb-2 text-white">Membership Benefits</h4>
                  <p className="text-surface-400 text-sm leading-relaxed mb-6">Support regularly to unlock exclusive content, Discord roles, and early access to drops.</p>
                  <button className="text-brand-500 text-xs font-black uppercase tracking-widest flex items-center gap-2 group-hover:gap-3 transition-all">
                    Explore Tiers <ChevronRight size={14} />
                  </button>
               </div>
               <div className="glass-card p-8 border-emerald-500/10 group hover:border-emerald-500/30 transition-all">
                  <Zap className="text-emerald-500 mb-4" size={24} />
                  <h4 className="font-bold text-lg mb-2 text-white">Project Goals</h4>
                  <p className="text-surface-400 text-sm leading-relaxed mb-6">Currently raising for a new studio setup and weekly community airdrops.</p>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 w-[65%] shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  </div>
                  <div className="flex justify-between mt-2">
                      <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">65% Reached</span>
                      <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">$3,250 / $5,000</span>
                  </div>
               </div>
            </div>
          </div>

          {/* Sticky Sidebar */}
          <div className="lg:w-[400px] shrink-0">
            <div className="sticky top-28 space-y-8">
              <TipWidget fixedRecipient={{
                username: profile.solDomain || profile.displayName,
                address: profile.walletAddress
              }} />
              
              <div className="glass-card p-8">
                 <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/20 flex items-center gap-2">
                        <TrendingUp size={14} className="text-brand-500" /> Recent Supporters
                    </h2>
                    <span className="text-[10px] font-bold text-brand-500 bg-brand-500/10 px-2 py-0.5 rounded-full">{supporterCount} Total</span>
                 </div>
                 <SupporterFeed tips={tipsReceived} />
              </div>
            </div>
          </div>

        </div>
      </main>

      <footer className="py-20 border-t border-white/5 text-center">
         <img src="/logo.svg" className="h-6 mx-auto mb-6 opacity-20 grayscale" alt="TipLnk" />
         <p className="text-surface-500 text-xs font-bold uppercase tracking-[0.3em]">The New Standard for Creator Monetization</p>
      </footer>
    </div>
  );
}

const CreatorHeader = ({ profile, supporterCount, totalVolume }) => {
  const displayName = profile.displayName || profile.username || 'Anonymous Creator';
  const avatarFallback = profile.walletAddress ? profile.walletAddress.slice(0, 2).toUpperCase() : '?';

  return (
    <div className="relative">
      {/* Cover Image with Gradient Overlay */}
      <div className="h-64 md:h-80 w-full bg-surface-900 border-b border-white/5 relative overflow-hidden">
        {profile.coverImageUrl ? (
          <img src={profile.coverImageUrl} alt="Cover" className="w-full h-full object-cover animate-fade-in" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-brand-600/20 via-surface-900 to-surface-950 flex items-center justify-center overflow-hidden">
             <img src="/logo.svg" className="w-1/2 opacity-5 blur-3xl scale-150 rotate-12" alt="" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-transparent to-transparent opacity-60" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-8 relative mt-[-64px] md:mt-[-80px] items-end md:items-center">
          
          {/* Avatar Container */}
          <div className="relative group">
            <div className="w-32 h-32 md:w-44 md:h-44 rounded-[40px] bg-surface-900 border-[8px] border-surface-950 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-transform duration-500 hover:scale-105 group-hover:rotate-1">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={displayName} className="w-full h-full object-cover animate-fade-in" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-black text-white/10 bg-surface-800">
                    {avatarFallback}
                </div>
              )}
            </div>
            {profile.walletAddress && (
              <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-brand-500 text-black flex items-center justify-center shadow-xl border-4 border-surface-950 animate-bounce-slow" title="Verified Creator">
                <ShieldCheck size={20} />
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="flex-1 pb-2 md:pt-16">
            <div className="flex flex-wrap items-center gap-4 mb-3">
              <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">{profile.solDomain || displayName}</h1>
              {profile.twitterHandle && (
                <a 
                  href={`https://x.com/${profile.twitterHandle}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-500 hover:bg-sky-500/20 transition-all shadow-lg shadow-sky-500/5"
                >
                  <Twitter size={14} fill="currentColor" />
                  <span className="text-[10px] font-black uppercase tracking-widest">@{profile.twitterHandle}</span>
                </a>
              )}
            </div>
            
            {/* Stats Badges */}
            <div className="flex flex-wrap items-center gap-4">
               <div className="flex items-center gap-2 bg-white/[0.03] border border-white/5 px-4 py-1.5 rounded-2xl">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                  <p className="text-xs font-bold text-surface-400 uppercase tracking-wider"><span className="text-white">{supporterCount}</span> Supporters</p>
               </div>
               <div className="flex items-center gap-2 bg-white/[0.03] border border-white/5 px-4 py-1.5 rounded-2xl">
                  <TrendingUp size={12} className="text-emerald-500" />
                  <p className="text-xs font-bold text-surface-400 uppercase tracking-wider"><span className="text-white">${totalVolume.toFixed(0)}</span> Total Tips</p>
               </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pb-2 md:pt-16">
            <button className="btn-secondary !rounded-2xl !px-6 !h-14 font-black uppercase tracking-widest text-xs flex items-center gap-2 group hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]">
               <Heart size={16} className="group-hover:fill-current group-hover:text-red-500 transition-colors" /> Follow
            </button>
            <button 
              onClick={() => document.getElementById('tip-widget')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              className="btn-primary !rounded-2xl !px-8 !h-14 font-black uppercase tracking-widest text-xs shadow-[0_15px_30px_rgba(159,53,232,0.3)] hover:scale-105 active:scale-95 transition-all"
            >
              Support Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CreatorTabs = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'about', label: 'About', icon: User },
    { id: 'posts', label: 'Posts', icon: MessageSquare },
    { id: 'gallery', label: 'Gallery', icon: ImageIcon }
  ];

  return (
    <div className="bg-surface-800/20 px-8">
      <nav className="flex space-x-12" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap py-6 px-1 border-b-4 font-black text-xs uppercase tracking-[0.2em] transition-all relative ${
              activeTab === tab.id
                ? 'border-brand-500 text-brand-500'
                : 'border-transparent text-surface-500 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
               <tab.icon size={16} />
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
      <div className="animate-fade-in space-y-12">
        <div className="space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-3">
                <FileText size={20} className="text-brand-500" /> 
                Biography
            </h3>
            {profile.bio ? (
                <p className="text-lg text-surface-300 leading-relaxed font-medium">
                    {profile.bio}
                </p>
            ) : (
                <div className="p-8 rounded-3xl bg-white/[0.02] border border-dashed border-white/10 text-center">
                    <p className="italic text-white/20 font-medium">This creator is letting their work speak for itself (no bio yet).</p>
                </div>
            )}
        </div>

        <div className="space-y-6 pt-12 border-t border-white/5">
            <h3 className="text-xl font-bold flex items-center gap-3">
                <Globe size={20} className="text-emerald-500" /> 
                Connected Identity
            </h3>
            <div className="flex flex-wrap gap-4">
            {profile.twitterHandle && (
                <a href={`https://x.com/${profile.twitterHandle}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 px-6 py-4 rounded-[24px] bg-white/[0.03] border border-white/5 text-white/80 hover:bg-white/10 hover:border-brand-500/30 transition-all group">
                <Twitter size={24} className="text-sky-400 group-hover:scale-110 transition-transform" fill="currentColor" /> 
                <div>
                    <span className="text-xs font-black uppercase tracking-widest text-white/20 block">X Profile</span>
                    <span className="font-bold text-lg">@{profile.twitterHandle}</span>
                </div>
                </a>
            )}
            {profile.link && (
                <a href={profile.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 px-6 py-4 rounded-[24px] bg-white/[0.03] border border-white/5 text-white/80 hover:bg-white/10 hover:border-brand-500/30 transition-all group">
                <Globe size={24} className="text-emerald-400 group-hover:scale-110 transition-transform" /> 
                <div>
                    <span className="text-xs font-black uppercase tracking-widest text-white/20 block">Personal Website</span>
                    <span className="font-bold text-lg">{profile.link.replace(/^https?:\/\//, '')}</span>
                </div>
                </a>
            )}
            {profile.walletAddress && (
                <div className="flex items-center gap-4 px-6 py-4 rounded-[24px] bg-white/[0.03] border border-white/5 text-white/80 transition-all">
                <ShieldCheck size={24} className="text-brand-500" /> 
                <div>
                    <span className="text-xs font-black uppercase tracking-widest text-white/20 block">Solana Wallet</span>
                    <span className="font-mono text-xs">{profile.walletAddress.slice(0, 8)}...{profile.walletAddress.slice(-8)}</span>
                </div>
                </div>
            )}
            </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'posts') {
    if (loadingPosts) {
      return (
        <div className="py-24 text-center">
            <Loader2 size={32} className="animate-spin text-brand-500 mx-auto mb-4" />
            <p className="text-surface-500 font-bold uppercase tracking-widest text-[10px]">Syncing with X Ledger...</p>
        </div>
      );
    }
    if (!posts?.data?.length) {
      return (
        <div className="py-24 bg-white/[0.02] border border-dashed border-white/10 rounded-[40px] text-center">
          <MessageSquare size={48} className="text-white/5 mx-auto mb-6" />
          <h4 className="text-xl font-bold text-white mb-2">No updates yet</h4>
          <p className="text-surface-500 text-sm max-w-xs mx-auto">This creator hasn't published any posts to their TipLnk timeline yet.</p>
        </div>
      );
    }
    return (
      <div className="space-y-8">
        {posts.data.map(post => <PostCard key={post.id} post={post} profile={profile} />)}
      </div>
    );
  }

  return (
     <div className="py-24 bg-white/[0.02] border border-dashed border-white/10 rounded-[40px] text-center">
        <ImageIcon size={48} className="text-white/5 mx-auto mb-6" />
        <h4 className="text-xl font-bold text-white mb-2">Digital Gallery</h4>
        <p className="text-surface-500 text-sm max-w-xs mx-auto">The creator's NFT portfolio and digital asset gallery will appear here soon.</p>
      </div>
  );
};

const PostCard = ({ post, profile }) => {
    const avatarFallback = profile.displayName ? profile.displayName[0].toUpperCase() : 'C';
    return (
        <div className="bg-surface-900 border border-white/5 p-8 rounded-[32px] hover:border-brand-500/20 transition-all shadow-xl group">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-surface-800 overflow-hidden ring-2 ring-white/5 group-hover:ring-brand-500/30 transition-all">
                    {profile.avatarUrl ? (
                        <img src={profile.avatarUrl} alt={profile.displayName} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center font-black text-white/20">{avatarFallback}</div>
                    )}
                </div>
                <div>
                    <p className="font-bold text-lg text-white leading-none mb-1">{profile.displayName}</p>
                    <a href={`https://x.com/${profile.twitterHandle}`} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-white/20 hover:text-brand-400 transition-colors uppercase tracking-widest">
                        @{profile.twitterHandle}
                    </a>
                </div>
                <div className="ml-auto flex flex-col items-end">
                    <Clock size={14} className="text-white/10 mb-1" />
                    <span className="text-[10px] font-black text-white/20 uppercase">{new Date(post.created_at).toLocaleDateString()}</span>
                </div>
            </div>
            <p className="text-surface-200 text-lg leading-relaxed whitespace-pre-wrap mb-8 font-medium">{post.text}</p>
            <div className="flex items-center gap-8 text-white/40 text-xs font-bold uppercase tracking-widest">
                <div className="flex items-center gap-2 hover:text-red-500 transition-colors cursor-pointer"><Heart size={16} /> {post.public_metrics.like_count}</div>
                <div className="flex items-center gap-2 hover:text-brand-500 transition-colors cursor-pointer"><Repeat size={16} /> {post.public_metrics.retweet_count}</div>
                <div className="flex items-center gap-2 hover:text-sky-500 transition-colors cursor-pointer"><MessageSquare size={16} /> {post.public_metrics.reply_count}</div>
                <button className="ml-auto p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 transition-all">
                    <Share2 size={16} />
                </button>
            </div>
        </div>
    );
};

const SupporterFeed = ({ tips }) => {
  if (tips.length === 0) {
    return (
      <div className="py-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto">
            <Heart size={20} className="text-white/10" />
        </div>
        <p className="text-xs text-white/20 font-bold uppercase tracking-[0.2em]">Be the first to tip!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
       <div className="space-y-3">
          {tips.slice(0, 10).map((tip, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-brand-500/20 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-brand-900 flex items-center justify-center text-xs text-white font-black shadow-lg">
                {tip.sender_name ? tip.sender_name[0].toUpperCase() : 'A'}
              </div>
              <div className="flex-1">
                <p className="text-sm text-white/80">
                  <span className="font-black text-white">{tip.sender_name || 'Anonymous'}</span>
                </p>
                {tip.message && (
                    <p className="text-xs text-white/40 mt-0.5 line-clamp-1 italic">"{tip.message}"</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-black text-brand-500 uppercase tracking-tighter">${parseFloat(tip.amountUSDC).toFixed(2)}</span>
                    <span className="w-1 h-1 rounded-full bg-white/10" />
                    <span className="text-[8px] font-bold text-white/20 uppercase">{new Date(tip.timestamp).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <ExternalLink size={12} className="text-white/20" />
              </div>
            </div>
          ))}
       </div>
       <button className="w-full py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-white transition-colors border-t border-white/5 pt-6 mt-4">
          View All Supporters
       </button>
    </div>
  );
};

