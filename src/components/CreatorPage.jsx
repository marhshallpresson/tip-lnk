import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getProfile } from '../utils/database';
import TipWidget from './TipWidget';
import {
  Twitter,
  Globe,
  Loader2,
  Heart,
  MessageSquare,
  Repeat,
  Image as ImageIcon,
  ShieldCheck
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

  if (loading) {
    return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center"><Loader2 size={32} className="text-white/20 animate-spin" /></div>;
  }
  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-center">
        <div><h2 className="text-2xl font-bold text-white">Profile Not Found</h2><p className="text-white/40 mt-2">The creator @{username} doesn't seem to exist.</p></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      <CreatorHeader profile={profile} supporterCount={supporterCount} />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          
          <div className="lg:col-span-2 space-y-8">
            <CreatorTabs activeTab={activeTab} setActiveTab={setActiveTab} />
            <TabContent activeTab={activeTab} profile={profile} tipsReceived={tipsReceived} />
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-8">
              <TipWidget fixedRecipient={{
                username: profile.solDomain || profile.displayName,
                address: profile.walletAddress
              }} />
              <SupporterFeed tips={tipsReceived} />
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

const CreatorHeader = ({ profile, supporterCount }) => {
  const displayName = profile.displayName || profile.username;
  return (
    <div>
      <div className="h-40 md:h-56 w-full bg-[#111111] border-b border-white/5 relative">
        {profile.coverImageUrl && (
          <img src={profile.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
        )}
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row gap-6 relative mt-[-48px] sm:mt-[-60px] items-end">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-[#1a1a1a] border-4 border-[#0a0a0a] overflow-hidden shadow-2xl shrink-0">
            {profile.avatarUrl && <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />}
          </div>
          <div className="flex-1 pb-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{profile.solDomain || displayName}</h1>
            </div>
            <p className="text-white/40 font-medium text-sm mt-1">{supporterCount} Supporters</p>
          </div>
          <div className="flex items-center gap-2 pb-2">
            <button className="btn-secondary !px-4 !py-2 text-sm">Follow</button>
            <button className="btn-primary !px-4 !py-2 text-sm">Support</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CreatorTabs = ({ activeTab, setActiveTab }) => {
  const tabs = ['about', 'posts', 'gallery'];
  return (
    <div className="border-b border-white/10">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === tab
                ? 'border-brand-500 text-brand-500'
                : 'border-transparent text-white/40 hover:text-white hover:border-white/20'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
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
      <div className="animate-fade-in space-y-6 prose prose-invert prose-p:text-white/60">
        {profile.bio ? <p>{profile.bio}</p> : <p className="italic text-white/30">This creator hasn't added a bio yet.</p>}
        <div className="flex flex-wrap gap-3 not-prose">
          {profile.twitterHandle && (
            <a href={`https://x.com/${profile.twitterHandle}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-white/80 hover:bg-white/10 text-xs font-medium">
              <Twitter size={14} className="text-white/40" /> @{profile.twitterHandle}
            </a>
          )}
          {profile.link && (
             <a href={profile.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-white/80 hover:bg-white/10 text-xs font-medium">
              <Globe size={14} className="text-white/40" /> {profile.link.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>
      </div>
    );
  }

  if (activeTab === 'posts') {
    if (loadingPosts) {
      return <div className="py-16 text-center"><Loader2 className="animate-spin text-white/20 mx-auto" /></div>;
    }
    if (!posts?.data?.length) {
      return (
        <div className="py-16 bg-[#111111] border border-white/5 rounded-xl text-center">
          <Twitter size={32} className="text-white/5 mx-auto mb-4" />
          <p className="text-white/20 font-semibold uppercase tracking-wider text-[10px]">No posts found or creator has not linked their X account.</p>
        </div>
      );
    }
    return (
      <div className="space-y-6">
        {posts.data.map(post => <PostCard key={post.id} post={post} profile={profile} />)}
      </div>
    );
  }

  return (
     <div className="py-16 bg-[#111111] border border-white/5 rounded-xl text-center">
        <ImageIcon size={32} className="text-white/5 mx-auto mb-4" />
        <p className="text-white/20 font-semibold uppercase tracking-wider text-[10px]">Gallery coming soon</p>
      </div>
  );
};

const PostCard = ({ post, profile }) => {
    return (
        <div className="bg-[#111111] border border-white/5 p-6 rounded-xl">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#1a1a1a] overflow-hidden">
                    {profile.avatarUrl && <img src={profile.avatarUrl} alt={profile.displayName} className="w-full h-full object-cover" />}
                </div>
                <div>
                    <p className="font-bold text-white">{profile.displayName}</p>
                    <a href={`https://x.com/${profile.twitterHandle}`} target="_blank" rel="noopener noreferrer" className="text-sm text-white/40 hover:text-white">
                        @{profile.twitterHandle}
                    </a>
                </div>
            </div>
            <p className="text-white/80 whitespace-pre-wrap mb-4">{post.text}</p>
            <div className="flex items-center gap-6 text-white/40 text-xs font-medium">
                <div className="flex items-center gap-1.5"><Heart size={14} /> {post.public_metrics.like_count}</div>
                <div className="flex items-center gap-1.5"><Repeat size={14} /> {post.public_metrics.retweet_count}</div>
                <div className="flex items-center gap-1.5"><MessageSquare size={14} /> {post.public_metrics.reply_count}</div>
                <span className="ml-auto text-[10px] uppercase">{new Date(post.created_at).toLocaleDateString()}</span>
            </div>
        </div>
    );
};

const SupporterFeed = ({ tips }) => {
  return (
    <div className="space-y-4">
       <h2 className="text-sm font-semibold uppercase tracking-wider text-white/20 flex items-center gap-2">
         <Heart size={14} /> Recent Supporters
       </h2>
       <div className="space-y-3">
        {tips.length === 0 ? (
          <div className="py-8 text-center text-xs text-white/20 italic">
            Be the first to leave a tip!
          </div>
        ) : (
          tips.slice(0, 5).map((tip, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03]">
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[10px] text-white/40 font-bold">
                {tip.sender_name ? tip.sender_name[0].toUpperCase() : 'A'}
              </div>
              <p className="text-xs text-white/60 flex-1">
                <span className="font-bold text-white">{tip.sender_name || 'Anonymous'}</span> gave a tip!
              </p>
              <span className="text-xs font-bold text-brand-500">${parseFloat(tip.amount).toFixed(2)}</span>
            </div>
          ))
        )}
       </div>
    </div>
  );
};
