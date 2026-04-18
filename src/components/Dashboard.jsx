import { useState, useCallback, Suspense, lazy } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Routes, Route, useNavigate, useLocation, Navigate, Outlet } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
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

export default function Dashboard() {
  const { publicKey, disconnect } = useWallet();
  const { user: authUser, logout: authLogout } = useAuth();
  const { profile, resetOnboarding, totalTipsUSDC } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const port = useWalletPortfolio();
  const [copied, setCopied] = useState(false);
  const [isReferralOpen, setIsReferralOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
    <div className="flex h-screen bg-main-bg text-white overflow-hidden font-sans relative">
      <ReferralModal 
        isOpen={isReferralOpen} 
        onClose={() => setIsReferralOpen(false)} 
        referralId={profile.referralId || profile.solDomain?.replace('.tiplnk.sol', '') || 'creator'}
      />

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />

      {/* --- MOBILE HEADER --- */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 z-[60]">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-brand-500 flex items-center justify-center">
                <Zap size={18} className="text-black" />
            </div>
            <span className="font-bold text-lg tracking-tight">TipLnk</span>
        </div>

        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-lg bg-[#111111] border border-white/10 text-white/60 active:scale-95 transition-transform"
        >
          {isSidebarOpen ? <XCircle size={20} /> : <MoreHorizontal size={20} />}
        </button>
      </div>

      {/* --- SIDEBAR --- */}
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[45]"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed md:static inset-y-0 left-0 w-64 border-r border-white/5 flex flex-col shrink-0 bg-[#0a0a0a] z-50 transition-transform duration-300 transform
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo Section */}
        <div className="hidden md:flex items-center gap-2 px-8 py-8">
            <div className="w-8 h-8 rounded bg-brand-500 flex items-center justify-center">
                <Zap size={18} className="text-black" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">TipLnk</span>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname.includes(item.id) || (item.id === 'overview' && location.pathname === '/dashboard');
            return (
              <button
                key={item.id}
                onClick={() => {
                  navigate(`/dashboard/${item.id === 'overview' ? '' : item.id}`);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${
                  isActive 
                    ? 'bg-white/5 text-brand-500' 
                    : 'text-white/40 hover:text-white hover:bg-white/[0.02]'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-white/5 mt-auto">
          <button
            onClick={handleDisconnect}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-red-500 hover:bg-red-500/5 transition-all font-medium text-sm"
          >
            <LogOut size={18} />
            Log Out
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 overflow-y-auto bg-[#0a0a0a] pt-16 md:pt-0">
        <div className="p-4 md:p-8 lg:p-12 max-w-6xl mx-auto">
          <Routes>
            <Route index element={<OverviewTab onInvite={() => setIsReferralOpen(true)} />} />
            <Route path="overview" element={<OverviewTab onInvite={() => setIsReferralOpen(true)} />} />
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

/* ─── Overview Tab ─── */
export function OverviewTab() {
  const { totalTipsUSDC, tipsReceived, profile } = useApp();
  const portfolio = useWalletPortfolio();

  const stats = [
    { label: 'Total Net Worth', value: portfolio.loading ? '...' : `$${portfolio.totalValueUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, icon: Wallet, color: 'text-brand-500', bgColor: 'bg-brand-500/10' },
    { label: 'Tips Earned', value: `$${totalTipsUSDC.toFixed(2)}`, icon: DollarSign, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
    { label: 'Tip Count', value: tipsReceived.length, icon: Gift, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
    { label: 'SOL Balance', value: portfolio.loading ? '...' : `${portfolio.solBalance.toFixed(3)} SOL`, icon: Zap, color: 'text-sky-500', bgColor: 'bg-sky-500/10' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ─── Level 1: Stats ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card flex flex-col items-start gap-4">
            <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
              <stat.icon size={20} className={stat.color} />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
              <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wider mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ─── Level 2: Portfolio ─── */}
          <div className="lg:col-span-2 space-y-8">
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-white/40 flex items-center gap-2">
                    <ShieldCheck size={16} /> On-Chain Assets
                    </h3>
                    <span className="badge badge-brand">
                        Live
                    </span>
                </div>

                {portfolio.loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 size={24} className="animate-spin text-brand-500" />
                        <p className="text-xs text-white/40">Syncing wallet...</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {portfolio.tokens.slice(0, 5).map((token) => (
                            <div key={token.mint} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/[0.02] transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center overflow-hidden border border-white/5">
                                        {token.icon && token.icon.startsWith('http') ? (
                                            <img src={token.icon} alt={token.symbol} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-xs font-bold">{token.symbol[0]}</span>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-sm text-white">{token.name}</h4>
                                        <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">{token.symbol}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-sm text-white">{token.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
                                    <p className="text-[10px] text-emerald-500 font-semibold uppercase tracking-wider">${token.valueUSD.toFixed(2)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
              </div>

              {/* ─── Level 3: NFTs ─── */}
              {portfolio.nfts.length > 0 && (
                <div className="glass-card p-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-white/40 flex items-center gap-2 mb-8">
                        <ImageIcon size={16} /> Digital Collectibles
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {portfolio.nfts.slice(0, 4).map((nft) => (
                            <div key={nft.id} className="group relative aspect-square rounded-xl overflow-hidden border border-white/5 bg-white/[0.02]">
                                <img src={nft.image} alt={nft.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                    <p className="text-[10px] font-semibold text-white truncate">{nft.name}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
              )}
          </div>

          <div className="space-y-8">
              {/* ─── Recent Tips ─── */}
              <div className="glass-card p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-white/40 flex items-center gap-2 mb-8">
                    <Clock size={16} /> Latest Earnings
                </h3>
                {tipsReceived.length === 0 ? (
                    <div className="text-center py-10 opacity-30">
                        <Gift size={24} className="mx-auto mb-3" />
                        <p className="text-[10px] font-semibold uppercase tracking-wider">No activity</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {tipsReceived.slice(0, 5).map((tip, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                    <ArrowDownLeft size={14} />
                                </div>
                                <div>
                                    <p className="font-semibold text-xs">{tip.sender}</p>
                                    <p className="text-[9px] text-white/40 font-semibold uppercase tracking-wider">{tip.inputAmount} {tip.inputToken}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold text-xs text-emerald-500">+${tip.amountUSDC.toFixed(2)}</p>
                            </div>
                        </div>
                        ))}
                        <button 
                            onClick={() => window.location.hash = 'history'}
                            className="w-full py-2.5 rounded-lg border border-white/5 text-[10px] font-semibold uppercase tracking-wider text-white/40 hover:text-white hover:bg-white/5 transition-all mt-2"
                        >
                            View All History
                        </button>
                    </div>
                )}
              </div>

              {/* ─── Share Kit ─── */}
              <div className="glass-card p-6 border-brand-500/20 bg-brand-500/[0.02]">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-brand-500 flex items-center justify-center text-black">
                            <QrCode size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-sm tracking-tight text-white">Creator Kit</h4>
                            <p className="text-[10px] text-brand-500 font-semibold uppercase tracking-wider">QR & Links</p>
                        </div>
                    </div>
                    <p className="text-xs text-white/40 leading-relaxed mb-6">
                        Your professional tipping page is ready to accept payments on-chain.
                    </p>
                    <button className="btn-outline w-full !py-2 text-[10px] font-semibold uppercase tracking-wider">
                        Open Kit <ArrowRight size={14} />
                    </button>
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
