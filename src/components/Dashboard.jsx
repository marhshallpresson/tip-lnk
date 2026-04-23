import { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
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

  // ─── ELITE WALKTHROUGH TRIGGER ───
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

    // ─── ONBOARDING PROMPT ───
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
    // ─── Professional Logout Sequence ───
    try {
      if (connected) {
        await disconnect().catch(() => null);
      }
      await authLogout().catch(() => null);
    } catch (e) {
      console.warn('Logout cleanup incomplete:', e);
    } finally {
      resetOnboarding();  // Clear Local Cache
      navigate('/');      // Return to Landing
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
      <ReferralModal
        isOpen={isReferralOpen}
        onClose={() => setIsReferralOpen(false)}
        referralId={profile.referralId || profile.solDomain?.replace('.tiplnk.sol', '') || 'creator'}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* --- MOBILE HEADER (Grass Style) --- */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#0c0c0c]/90 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 z-[60]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center">
            <Zap size={18} className="text-brand-500" />
          </div>
          <span className="font-bold text-lg tracking-tight">TipLnk</span>
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
        fixed md:static inset-y-0 left-0 w-[88px] border-r border-white/5 flex flex-col items-center shrink-0 bg-[#000000] z-50 transition-transform duration-300 transform
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo Section */}
        <div className="py-10">
          <div className="w-10 h-10 rounded-[14px] bg-brand-500 flex items-center justify-center shadow-[0_0_20px_rgba(159,53,232,0.2)]">
            <Zap size={22} className="text-black" />
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 w-full px-4 flex flex-col items-center gap-4 py-4">
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
                title={item.label}
              >
                <item.icon size={22} />
                {isActive && (
                  <div className="absolute left-[-16px] w-1 h-6 bg-brand-500 rounded-r-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="py-8 flex flex-col items-center gap-6">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="grass-sidebar-btn text-white/20 hover:text-white"
            title="Support"
          >
            <Heart size={20} />
          </button>
          <button
            onClick={handleDisconnect}
            className="grass-sidebar-btn text-red-500/40 hover:text-red-500 hover:bg-red-500/5"
            title="Log Out"
          >
            <LogOut size={20} />
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
                onClick={() => setIsReferralOpen(true)}
                className="grass-pill bg-brand-500 !text-black !border-none hover:opacity-90 active:scale-95 transition-all font-bold text-xs"
              >
                SHARE WITH FRIENDS
              </button>
            </div>
          </div>

          <Routes>
            <Route index element={<OverviewTab />} />
            <Route path="overview" element={<OverviewTab />} />
            <Route path="analytics" element={<CreatorAnalyticsPanel />} />
            <Route path="embed" element={<EmbedGenerator creatorAddress={address} handle={profile.solDomain || profile.displayName || address} />} />
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

/* ─── Overview Tab (Grass Style Rebuild) ─── */
export function OverviewTab() {
  const { totalTipsUSDC, tipsReceived, profile } = useApp();
  const portfolio = useWalletPortfolio();

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Welcome Banner (Grass Style) */}
      <div className="grass-banner">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="max-w-2xl">
            <h2 className="text-xl font-bold mb-2">Welcome to TipLnk!</h2>
            <p className="text-white/40 text-sm leading-relaxed">
              See your earnings at a glance.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-500">
              <TrendingUp size={24} />
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Active Status</p>
              <p className="text-lg font-bold text-brand-500">Node Online</p>
            </div>
          </div>
        </div>
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 blur-[100px] -mr-32 -mt-32" />
      </div>

      {/* Main Stats Grid (Grass Style) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Earnings Card */}
        <div className="grass-card flex flex-col justify-between min-h-[220px]">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Earnings</h3>
            <RefreshCw size={18} className="text-white/20 hover:text-white cursor-pointer transition-colors" />
          </div>

          <div className="grid grid-cols-2 gap-8 border-t border-white/5 pt-8 mt-4">
            <div className="space-y-1">
              <p className="grass-stat-label">Total Earnings</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-black">
                  <Zap size={16} />
                </div>
                <span className="grass-stat-value">${totalTipsUSDC.toFixed(2)}</span>
              </div>
              <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest pt-2">Uptime: 0 day, 0 hr, 0 min</p>
            </div>
            <div className="space-y-1">
              <p className="grass-stat-label">Today's Tips</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-500">
                  <Gift size={16} />
                </div>
                <span className="grass-stat-value">{tipsReceived.length}</span>
              </div>
              <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest pt-2">Last Tip: Just now</p>
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div className="grass-card flex flex-col justify-between min-h-[220px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                <Shield size={20} />
              </div>
              <div>
                <h4 className="font-bold text-sm tracking-tight text-white">Onboarding Completion</h4>
                <p className="text-[10px] text-orange-500 font-semibold uppercase tracking-wider italic">Action Required</p>
              </div>
            </div>
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          </div>

          <p className="text-xs text-white/40 leading-relaxed py-4">
            Complete your profile and link your social handles to increase your earnings potential.
          </p>

          <button className="w-full py-4 rounded-[18px] bg-brand-500 text-black font-bold uppercase tracking-wider text-xs hover:shadow-[0_0_30px_rgba(159,53,232,0.3)] transition-all active:scale-[0.98]">
            CONNECT NETWORK / HANDLE
          </button>
        </div>
      </div>

      {/* Large Statistics Area (Grass Style Chart Simulator) */}
      <div className="grass-card">
        <div className="flex items-center justify-between mb-10">
          <h3 className="text-lg font-bold flex items-center gap-3 italic">
            <TrendingUp size={22} className="text-brand-500" />
            EARNINGS STATISTICS
          </h3>
          <button className="text-[10px] font-bold text-white/40 uppercase tracking-widest hover:text-white flex items-center gap-2">
            REFRESH <RefreshCw size={12} />
          </button>
        </div>

        <div className="h-[300px] w-full flex flex-col justify-end gap-2 relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-[10px] font-bold text-white/10 uppercase tracking-[0.3em]">Collecting Analytics Data</p>
          </div>

          {/* Mock Chart Grid */}
          <div className="flex items-end justify-between px-2 h-full border-b border-white/5 pb-2">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 w-full group">
                <div
                  className="w-1 bg-brand-500/20 group-hover:bg-brand-500 transition-all rounded-full"
                  style={{ height: `${Math.random() * 100 + 10}%` }}
                />
                <span className="text-[8px] font-bold text-white/20 group-hover:text-white/60 transition-colors uppercase">{i + 1}H</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 mt-8 pt-6 border-t border-white/5">
          {[
            { label: 'Network Points', color: 'bg-sky-500' },
            { label: 'Tip Velocity', color: 'bg-brand-500' },
            { label: 'Referral Bonus', color: 'bg-purple-500' },
            { label: 'Uptime Rank', color: 'bg-emerald-500' },
            { label: 'Social Edge', color: 'bg-orange-500' }
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${item.color}`} />
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Asset Explorer (Grass Style Integration) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="grass-card">
          <h3 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-8 italic">Asset Portfolio</h3>
          {portfolio.loading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <Loader2 size={20} className="animate-spin text-brand-500" />
            </div>
          ) : (
            <div className="space-y-4">
              {portfolio.tokens.slice(0, 4).map(token => (
                <div key={token.mint} className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-[14px] bg-[#111111] flex items-center justify-center p-1 border border-white/5">
                      <img src={token.icon} alt="" className="w-full h-full rounded-[10px] grayscale group-hover:grayscale-0 transition-all" />
                    </div>
                    <span className="text-sm font-bold">{token.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">${token.valueUSD.toFixed(2)}</p>
                    <p className="text-[10px] text-white/40 font-bold uppercase">{token.balance} {token.symbol}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grass-card">
          <h3 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-8 italic">Recent Activity</h3>
          <div className="space-y-4">
            {tipsReceived.slice(0, 3).map((tip, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-[14px] bg-brand-500/10 flex items-center justify-center text-brand-500">
                    <ArrowDownLeft size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{tip.sender}</p>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Inbound Tip</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-brand-500">+${tip.amountUSDC.toFixed(2)}</span>
              </div>
            ))}
            {tipsReceived.length === 0 && <p className="text-center py-6 text-[10px] font-bold text-white/20 uppercase tracking-widest">No recent transactions</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Setting Tab ─── */
export function SettingTab({ onInvite, onOpenSettings }) {
  const { totalTipsUSDC, profile } = useApp();
  const portfolio = useWalletPortfolio();

  const accountCards = [
    {
      id: 'personal',
      title: 'Personal details',
      desc: 'Review and update your personal info',
      icon: Users,
      badge: 'Verified',
      action: onOpenSettings,
      color: 'text-brand-500'
    },
    {
      id: 'invite',
      title: 'Invite friends',
      desc: 'Earn rewards by bringing in your friends',
      icon: Gift,
      action: onInvite,
      color: 'text-accent-yellow'
    },
  ];

  return (
    <div className="space-y-10 animate-fade-in">
      <section>
        <h2 className="text-3xl font-black mb-8">Account Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accountCards.map((card) => (
            <button
              key={card.id}
              onClick={card.action}
              className="flex items-center justify-between p-6 bg-surface-900 border border-surface-800 rounded-2xl hover:bg-surface-950 transition-all text-left group"
            >
              <div className="flex gap-4">
                <div className={`w-10 h-10 rounded-xl bg-surface-800 flex items-center justify-center shrink-0`}>
                  <card.icon size={20} className={card.color} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white">{card.title}</h3>
                    {card.badge && (
                      <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-bold text-white/50">
                        {card.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-surface-500 mt-0.5">{card.desc}</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-surface-700 group-hover:text-white transition-colors" />
            </button>
          ))}
        </div>
      </section>


      <ShareQRPanel />
    </div>
  );
}

function AssetRow({ name, label, balance, value, icon }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl hover:bg-surface-950 transition-all cursor-pointer group">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-800">
          <img src={icon} alt="" className="w-full h-full object-cover" />
        </div>
        <div>
          <h4 className="font-bold text-white text-sm">{name}</h4>
          <p className="text-xs text-surface-500">{label}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-bold text-white text-sm">{balance} {name}</p>
        <p className="text-xs text-surface-500">{value}</p>
      </div>
    </div>
  );
}

/* ─── Transaction History Tab (Solflare Track) ─── */
export function TransactionHistoryTab() {
  const { transactions, loading, error, refresh } = useTransactionHistory();

  const typeConfig = {
    tip_received: { icon: ArrowDownLeft, color: 'text-accent-green', label: 'Tip Received', bg: 'bg-accent-green/10' },
    tip_sent: { icon: ArrowUpRight, color: 'text-accent-orange', label: 'Tip Sent', bg: 'bg-accent-orange/10' },
    swap: { icon: Repeat, color: 'text-accent-cyan', label: 'Swap', bg: 'bg-accent-cyan/10' },
    stake: { icon: TrendingUp, color: 'text-accent-purple', label: 'Stake', bg: 'bg-accent-purple/10' },
    transfer: { icon: Send, color: 'text-brand-400', label: 'Transfer', bg: 'bg-brand-600/10' },
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="glass-card p-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Clock size={18} className="text-brand-400" /> Transaction History
        </h3>
        <button onClick={refresh} className="btn-secondary !px-3 !py-2 flex items-center gap-1.5 text-xs">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="glass-card p-10 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-surface-500" />
        </div>
      ) : error ? (
        <div className="glass-card p-6 text-center">
          <AlertCircle size={24} className="text-accent-red mx-auto mb-2" />
          <p className="text-accent-red text-sm">{error}</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <Clock size={32} className="text-surface-700 mx-auto mb-3" />
          <p className="text-surface-500">No transactions found.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          {transactions.map((tx, i) => {
            const config = typeConfig[tx.type] || typeConfig.transfer;
            const TxIcon = config.icon;
            return (
              <div key={tx.signature} className={`flex items-center justify-between p-4 hover:bg-surface-800/40 transition-colors ${i < transactions.length - 1 ? 'border-b border-surface-800/40' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg ${config.bg} flex items-center justify-center`}>
                    <TxIcon size={16} className={config.color} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{config.label}</p>
                      {!tx.err ? (
                        <CheckCircle size={12} className="text-accent-green" />
                      ) : (
                        <XCircle size={12} className="text-accent-red" />
                      )}
                    </div>
                    <p className="text-surface-500 text-xs font-mono">{tx.signature.slice(0, 16)}...</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold text-sm ${tx.isIncoming ? 'text-accent-green' : 'text-surface-300'}`}>
                    {tx.isIncoming ? '+' : '-'}{tx.amount} {tx.token}
                  </p>
                  <p className="text-surface-600 text-[10px] font-mono mt-0.5 truncate max-w-[80px] ml-auto">
                    {tx.isIncoming ? 'From: ' : 'To: '}{tx.counterparty}
                  </p>
                  <p className="text-surface-600 text-[10px] mt-1">
                    {new Date(tx.timestamp).toLocaleDateString()} {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
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
            You're connected, but your profile is incomplete. Claim your <span className="text-brand-400 font-bold">.tiplnk.sol</span> handle now to unlock verified status and real-time revenue analytics.
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

