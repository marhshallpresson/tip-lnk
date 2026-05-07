import { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { Routes, Route, useNavigate, useLocation, Navigate, Outlet } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import useWalletPortfolio from '../hooks/useWalletPortfolio';
import useTransactionHistory from '../hooks/useTransactionHistory';
import { useTransactionSimulation } from '../hooks/useTransactionSimulation';
import TipWidget from './TipWidget';
import PayoutPanel from './PayoutPanel';
import CreatorAnalyticsPanel from './CreatorAnalyticsPanel';
import ShareQRPanel from './ShareQRPanel';
import { useKamino } from '../hooks/useKamino';
import {
  Wallet, Globe, Image as ImageIcon, DollarSign, TrendingUp, Copy, Check, LogOut,
  BarChart3, Gift, ArrowRight, RefreshCw, Zap, Eye, Send, AlertCircle,
  ArrowUpRight, ArrowDownLeft, Repeat, MoreHorizontal, QrCode, Share2,
  ExternalLink, Clock, CheckCircle, XCircle, Loader2, CreditCard,
  Ticket, PieChart, Shield, ShieldCheck, Vault, ArrowRightLeft, Code as CodeIcon,
  Users, Heart, FileJson, ChevronRight
} from 'lucide-react';

import ReferralModal from './ReferralModal';
import EmbedGenerator from './EmbedGenerator';
import SettingsModal from './SettingsModal';
import DistributionModal from './DistributionModal';
import DashboardWalkthrough from './DashboardWalkthrough';

export default function Dashboard() {
  const { publicKey, disconnect, connected } = useWallet();
  const { user: authUser, logout: authLogout } = useAuth();
  const { profile, resetOnboarding, totalTipsUSDC, role } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const port = useWalletPortfolio();
  const [copied, setCopied] = useState(false);
  const [isReferralOpen, setIsReferralOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [showOnboardingPrompt, setShowOnboardingPrompt] = useState(false);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isDistributionOpen, setIsDistributionOpen] = useState(false);

  useEffect(() => {
    const hasSeenWalkthrough = localStorage.getItem(`walkthrough_seen_${authUser?.id}`);
    const onboardingFinishedJustNow = localStorage.getItem('onboarding_just_finished') === 'true';

    if (onboardingFinishedJustNow && authUser) {
      setShowWalkthrough(true);
      localStorage.removeItem('onboarding_just_finished');
      localStorage.setItem(`walkthrough_seen_${authUser?.id}`, 'true');
    } else if (!hasSeenWalkthrough && authUser && role === 'creator') {
      setShowWalkthrough(true);
    }

    if (role === 'user' && authUser) {
      setShowOnboardingPrompt(true);
    }
  }, [authUser, role]);

  const handleWalkthroughComplete = () => {
    localStorage.setItem(`walkthrough_seen_${authUser?.id}`, 'true');
    setShowWalkthrough(false);
  };

  const address = publicKey?.toBase58() || '';
  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';


  const handleDisconnect = async () => {
    try {
      if (connected) {
        await disconnect().catch(() => null);
      }
      await authLogout().catch(() => null);
    } catch (e) {
      console.warn('Logout cleanup incomplete:', e);
    } finally {
      resetOnboarding();
      navigate('/');
    }
  };

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'analytics', label: 'Tip Jar', icon: Gift },
    { id: 'embed', label: 'Share & Embed', icon: CodeIcon },
    { id: 'history', label: 'Transactions', icon: Clock },
    { id: 'payouts', label: 'Withdraw', icon: DollarSign },
    { id: 'settings', label: 'Settings', icon: Shield },
  ];

  return (
    <div className="flex h-screen bg-[#000000] text-white overflow-hidden font-sans relative">
      {showWalkthrough && (
        <DashboardWalkthrough onComplete={handleWalkthroughComplete} />
      )}

      {showOnboardingPrompt && (
        <OnboardingPromptModal
          onClose={() => setShowOnboardingPrompt(false)}
          onContinue={() => navigate('/onboarding')}
        />
      )}
      
      {isShareModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-card max-w-2xl w-full p-8 relative border-white/10 shadow-2xl">
            <ShareQRPanel onClose={() => setIsShareModalOpen(false)} />
          </div>
        </div>
      )}

      <ReferralModal
        isOpen={isReferralOpen}
        onClose={() => setIsReferralOpen(false)}
        referralId={profile.referralId || profile.solDomain?.replace('.tipstack.sol', '') || 'creator'}
      />

      <DistributionModal 
        isOpen={isDistributionOpen}
        onClose={() => setIsDistributionOpen(false)}
        creatorId={authUser?.id}
        handle={profile.solDomain || profile.displayName || authUser?.id}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* --- MOBILE HEADER (Grass Style) --- */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#0c0c0c]/90 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 z-[60]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center" onClick={() => setIsShareModalOpen(true)}>
            <QrCode size={18} className="text-brand-500" />
          </div>
          <span className="font-bold text-lg tracking-tight">Tip Stack</span>
        </div>

        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="w-10 h-10 rounded-xl bg-[#111111] border border-white/10 flex items-center justify-center text-white/60 active:scale-95 transition-transform"
        >
          {isSidebarOpen ? <XCircle size={20} /> : <MoreHorizontal size={20} />}
        </button>
      </div>

      {/* --- SIDEBAR (Grass Style) --- */}
      <aside className={`
        fixed md:static inset-y-0 left-0 w-[240px] border-r border-white/5 flex flex-col items-start shrink-0 bg-[#000000] z-50 transition-transform duration-300 transform
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo Section */}
        <div className="py-10 px-8 w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-brand-500 flex items-center justify-center shadow-[0_0_20px_rgba(159,53,232,0.2)]">
              <img src="favicon.svg" alt="Tip Stack" className="w-6 h-6" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">Tip Stack</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 w-full px-4 flex flex-col items-start gap-2 py-4">
          {menuItems.map((item) => {
            const isActive = location.pathname.includes(item.id) || (item.id === 'overview' && location.pathname === '/dashboard');
            return (
              <button
                key={item.id}
                onClick={() => {
                  navigate(`/dashboard/${item.id === 'overview' ? '' : item.id}`);
                  setIsSidebarOpen(false);
                }}
                className={`grass-sidebar-btn ${isActive ? 'grass-sidebar-btn-active' : ''} group relative`}
              >
                <item.icon size={20} className={isActive ? 'text-brand-500' : 'text-inherit'} />
                <span className="font-bold text-sm tracking-tight">{item.label}</span>
                {isActive && (
                  <div className="absolute left-0 w-1 h-5 bg-brand-500 rounded-r-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="py-8 px-4 w-full flex flex-col items-start gap-2">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="grass-sidebar-btn"
          >
            <Heart size={20} />
            <span className="font-bold text-sm tracking-tight">Support</span>
          </button>
          <button
            onClick={handleDisconnect}
            className="grass-sidebar-btn !text-red-500/40 hover:!text-red-500 hover:bg-red-500/5"
          >
            <LogOut size={20} />
            <span className="font-bold text-sm tracking-tight">Log Out</span>
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT (Grass Style) --- */}
      <main className="flex-1 overflow-y-auto bg-[#000000] pt-16 md:pt-0">
        <div className="p-4 md:p-8 lg:p-10 max-w-[1400px] mx-auto">
          {/* Header Status Bar (Grass Style) */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-6">
            <div className="flex items-center gap-4">
              <div className="grass-pill bg-[#111111] !px-5 !py-2.5">
                <span className="text-sm font-bold tracking-tight">Dashboard</span>
              </div>
              <button 
                onClick={() => setIsShareModalOpen(true)}
                className="grass-pill bg-white/5 border-white/5 hover:bg-white/10 flex items-center gap-2"
              >
                <QrCode size={14} className="text-brand-500" />
                <span className="text-xs font-bold tracking-tight text-white/60">RECEIVE</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden lg:flex items-center gap-3 grass-pill !bg-transparent border-white/5">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-6 h-6 rounded-full border-2 border-black bg-surface-800" />
                  ))}
                </div>
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-2">Network Friends</span>
              </div>
              <button
                onClick={() => setIsDistributionOpen(true)}
                className="grass-pill bg-brand-500 !text-black !border-none hover:opacity-90 active:scale-95 transition-all font-bold text-xs"
              >
                SHARE WITH FRIENDS
              </button>
            </div>
          </div>

          <Routes>
            <Route index element={<OverviewTab onReceive={() => setIsShareModalOpen(true)} />} />
            <Route path="overview" element={<OverviewTab onReceive={() => setIsShareModalOpen(true)} />} />
            <Route path="analytics" element={<CreatorAnalyticsPanel />} />
            <Route path="embed" element={<EmbedGenerator creatorId={authUser?.id} handle={profile.solDomain || profile.displayName || authUser?.id} />} />
            <Route path="history" element={<TransactionHistoryTab />} />
            <Route path="payouts" element={<PayoutPanel />} />
            <Route path="settings" element={<SettingTab onInvite={() => setIsReferralOpen(true)} onOpenSettings={() => setIsSettingsOpen(true)} />} />
            <Route path="*" element={<Navigate to="overview" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

/* ─── Overview Tab (Minimalist Dashboard) ─── */
export function OverviewTab({ onReceive }) {
  const { totalTipsUSDC, tipsReceived, profile, onboardingComplete } = useApp();
  const { user: authUser } = useAuth();
  const navigate = useNavigate();

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://tipstack.fun/${profile.solDomain || profile.displayName || authUser?.id}`);
    // Optional: show a simple toast
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-bold">Hello, {profile.displayName || (authUser?.name ? authUser.name.split(' ')[0] : 'Creator')} 👋</h2>
        <button 
          onClick={onReceive}
          className="md:hidden grass-pill bg-brand-500 !text-black font-bold text-xs"
        >
          RECEIVE
        </button>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 group cursor-pointer hover:border-brand-500/30 transition-all" onClick={onReceive}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-white/60">Total Earned</p>
            <QrCode size={16} className="text-brand-500" />
          </div>
          <p className="text-3xl font-bold tracking-tight">${totalTipsUSDC.toFixed(2)}</p>
          <p className="text-xs text-brand-500 mt-2 font-bold uppercase tracking-widest text-[9px]">Click to Receive Tip</p>
        </div>

        <div className="bg-[#111111] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-white/60">Tips Received</p>
            <Gift size={16} className="text-white/40" />
          </div>
          <p className="text-3xl font-bold tracking-tight">{tipsReceived.length}</p>
          <p className="text-xs text-white/40 mt-2">All time</p>
        </div>
      </div>

      {/* Link Sharing */}
      <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
        <div>
           <p className="text-sm font-medium text-white/60 mb-1">Your tipping link</p>
           <p className="text-base font-bold">tipstack.fun/{profile.solDomain || profile.displayName || authUser?.id}</p>
        </div>
        <button 
           onClick={handleCopyLink}
           className="w-full sm:w-auto px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-white/90 transition-colors"
        >
           Copy Link
        </button>
      </div>

      {/* Recent Tips Summary */}
      <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 mt-6">
         <div className="flex items-center justify-between mb-6">
            <p className="text-sm font-bold">Recent Tips</p>
            <button onClick={() => navigate('/dashboard/history')} className="text-xs text-white/60 hover:text-white">View All &gt;</button>
         </div>
         <div className="space-y-4">
            {tipsReceived.length === 0 ? (
               <p className="text-sm text-white/40 text-center py-4">No tips yet. Share your link to get started!</p>
            ) : (
               tipsReceived.slice(0,3).map((tip, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                     <p className="text-sm font-medium">{tip.sender || 'Anonymous'}</p>
                     <p className="text-sm font-bold text-emerald-400">+${tip.amountUSDC.toFixed(2)}</p>
                  </div>
               ))
            )}
         </div>
      </div>
    </div>
  );
}

/* ─── Transaction History Tab (Minimalist Ledger) ─── */
export function TransactionHistoryTab() {
  const { transactions, loading, error, refresh } = useTransactionHistory();
  const { tipsReceived } = useApp();
  const [filter, setFilter] = useState('all');

  return (
    <div className="space-y-6 animate-fade-in pb-20 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Inbox & History</h2>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar">
         {['all', 'today', 'week', 'month'].map(f => (
            <button 
               key={f}
               onClick={() => setFilter(f)}
               className={`px-4 py-2 rounded-full text-sm font-medium capitalize whitespace-nowrap ${filter === f ? 'bg-white text-black' : 'bg-[#111111] text-white/60 border border-white/10 hover:text-white'}`}
            >
               {f}
            </button>
         ))}
      </div>

      {tipsReceived.length === 0 ? (
         <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
               <Gift size={32} className="text-white/20" />
            </div>
            <h3 className="text-lg font-bold mb-2">No tips yet</h3>
            <p className="text-sm text-white/40 max-w-xs">Share your link and let your fans send a little love your way.</p>
         </div>
      ) : (
         <div className="space-y-4">
            {tipsReceived.map((tip, i) => (
               <div key={i} className="bg-[#111111] border border-white/10 rounded-2xl p-6">
                  <div className="flex justify-between items-start mb-4">
                     <div>
                        <p className="text-sm text-white/60 mb-1">{new Date(tip.timestamp).toLocaleDateString()}</p>
                        <p className="font-bold text-white">{tip.sender || 'Anonymous'}</p>
                     </div>
                     <div className="px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-emerald-400 font-bold text-sm">
                        +${tip.amountUSDC.toFixed(2)}
                     </div>
                  </div>
                  {tip.note && (
                     <div className="bg-white/5 rounded-xl p-4 mb-4">
                        <p className="text-sm text-white/80 leading-relaxed">"{tip.note}"</p>
                     </div>
                  )}
                  <div className="flex gap-3 mt-4">
                     <button className="flex-1 py-2.5 bg-brand-500 text-black font-bold text-xs rounded-xl hover:bg-brand-400 transition-colors">
                        Share on X
                     </button>
                     <button className="flex-1 py-2.5 bg-white/5 text-white font-bold text-xs rounded-xl hover:bg-white/10 transition-colors border border-white/10">
                        Download Image
                     </button>
                  </div>
               </div>
            ))}
         </div>
      )}
    </div>
  );
}

/* ─── Setting Tab (Minimalist) ─── */
export function SettingTab({ onInvite, onOpenSettings }) {
  const { connected } = useWallet();
  const { deposit, withdraw, totalValue, depositing, withdrawing } = useKamino(connected);
  const [isYieldLoading, setIsYieldLoading] = useState(false);

  const toggleYield = async () => {
    if (isYieldLoading) return;
    setIsYieldLoading(true);
    try {
      if (totalValue > 0) {
        console.log('Withdrawing from Kamino...');
        const tx = await withdraw('max');
        // Sign and send logic would go here
      } else {
        console.log('Depositing to Kamino...');
        const tx = await deposit(10); // Example amount
        // Sign and send logic would go here
      }
    } catch (err) {
      console.error('Yield toggle failed:', err);
    } finally {
      setIsYieldLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-8">Settings</h2>
      
      <div className="bg-[#111111] border border-white/10 rounded-2xl overflow-hidden">
         <button onClick={onOpenSettings} className="w-full flex items-center justify-between p-5 border-b border-white/5 hover:bg-white/5 transition-colors text-left">
            <span className="font-medium text-sm">Account Details</span>
            <ChevronRight size={18} className="text-white/40" />
         </button>
         <button onClick={onInvite} className="w-full flex items-center justify-between p-5 border-b border-white/5 hover:bg-white/5 transition-colors text-left">
            <span className="font-medium text-sm">Invite Friends</span>
            <ChevronRight size={18} className="text-white/40" />
         </button>
         <div 
            onClick={toggleYield}
            className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors text-left cursor-pointer"
         >
            <div>
               <span className="font-medium text-sm block">Smart Yield (Kamino)</span>
               <span className="text-xs text-white/40 block mt-1">
                {depositing || withdrawing || isYieldLoading ? 'Processing transaction...' : 'Auto-earn interest on idle tips'}
               </span>
            </div>
            <div className={`w-10 h-6 rounded-full relative transition-colors ${totalValue > 0 ? 'bg-brand-500' : 'bg-white/10'}`}>
               <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${totalValue > 0 ? 'right-1' : 'left-1'}`}></div>
            </div>
         </div>
      </div>
    </div>
  );
}

/* ─── Elite Onboarding Prompt Modal ─── */
function OnboardingPromptModal({ onClose, onContinue }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-card max-w-md w-full p-8 relative overflow-hidden shadow-2xl shadow-brand-500/10 border-brand-500/20">
        {/* Subtle background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-500/10 blur-[80px]" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-white/20 hover:text-white transition-colors z-10"
        >
          <XCircle size={20} />
        </button>

        <div className="flex flex-col items-center text-center relative z-10">
          <div className="w-20 h-20 rounded-[24px] bg-brand-500/10 flex items-center justify-center mb-8 border border-brand-500/20 shadow-inner">
            <Zap className="text-brand-500" size={40} fill="currentColor" />
          </div>

          <h3 className="text-3xl font-black mb-4 tracking-tighter text-white">Complete Your Profile</h3>
          <p className="text-white/50 text-sm leading-relaxed mb-10 px-4">
            You're connected, but your profile is incomplete. Claim your <span className="text-brand-400 font-bold">.tipstack.sol</span> handle now to unlock verified status and real-time revenue analytics.
          </p>

          <div className="space-y-4 w-full">
            <button
              onClick={onContinue}
              className="w-full py-4 rounded-2xl bg-brand-500 text-black font-black uppercase tracking-tighter hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_40px_rgba(159,53,232,0.2)]"
            >
              Finish Setup Now
              <ArrowRight size={20} />
            </button>
            <button
              onClick={onClose}
              className="w-full py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-white transition-colors"
            >
              Explore Dashboard First
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

