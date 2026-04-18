import { useState, useCallback, Suspense, lazy } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Routes, Route, useNavigate, useLocation, Navigate, Outlet } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import useWalletPortfolio from '../hooks/useWalletPortfolio';
import useTransactionHistory from '../hooks/useTransactionHistory';
import useTransactionSimulation from '../hooks/useTransactionSimulation';
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


  const handleDisconnect = () => {
    disconnect();
    resetOnboarding();
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
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-surface-950/80 backdrop-blur-md border-b border-surface-900 flex items-center justify-between px-6 z-[60]">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
                <Zap size={18} className="text-black fill-black" />
            </div>
            <span className="font-black italic tracking-tighter text-lg">TipLnk</span>
        </div>

        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-xl bg-surface-900 border border-surface-800 text-surface-400 active:scale-95 transition-transform"
        >
          {isSidebarOpen ? <XCircle size={20} className="text-brand-400" /> : <MoreHorizontal size={20} />}
        </button>
      </div>

      {/* --- SIDEBAR --- */}
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-md z-[45]"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed md:static inset-y-0 left-0 w-64 border-r border-surface-900 flex flex-col shrink-0 bg-surface-950 md:bg-surface-950/20 z-50 transition-transform duration-300 transform
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        

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
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-bold text-sm ${
                  isActive 
                    ? 'bg-surface-900 border border-surface-800 text-brand-500 shadow-sm' 
                    : 'text-surface-500 hover:text-white hover:bg-surface-950/50'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 overflow-y-auto bg-[#0a0d11] pt-16 md:pt-0">
        <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
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

/* ─── Overview Tab (Elite Solflare Track Overhaul) ─── */
export function OverviewTab() {
  const { totalTipsUSDC, tipsReceived, profile } = useApp();
  const portfolio = useWalletPortfolio();

  const stats = [
    { label: 'Total Net Worth', value: portfolio.loading ? '...' : `$${portfolio.totalValueUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, icon: Wallet, color: 'text-brand-400', bgColor: 'bg-brand-600/10' },
    { label: 'Tips Earned', value: `$${totalTipsUSDC.toFixed(2)}`, icon: DollarSign, color: 'text-accent-green', bgColor: 'bg-accent-green/10' },
    { label: 'Tip Count', value: tipsReceived.length, icon: Gift, color: 'text-accent-purple', bgColor: 'bg-accent-purple/10' },
    { label: 'SOL Balance', value: portfolio.loading ? '...' : `${portfolio.solBalance.toFixed(3)} ◎`, icon: Zap, color: 'text-accent-cyan', bgColor: 'bg-accent-cyan/10' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── Level 1: Wealth & Activity Intelligence ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card group hover:border-brand-500/30 transition-all">
            <div className={`w-9 h-9 rounded-xl ${stat.bgColor} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              <stat.icon size={16} className={stat.color} />
            </div>
            <p className="text-xl md:text-2xl font-black italic tracking-tighter">{stat.value}</p>
            <p className="text-surface-500 text-[10px] font-black uppercase tracking-widest mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ─── Level 2: Portfolio Visualizer (Solflare Track Core) ─── */}
          <div className="lg:col-span-2 space-y-6">
              <div className="glass-card p-6 border-brand-500/10">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-black italic uppercase tracking-tighter flex items-center gap-2">
                    <ShieldCheck size={18} className="text-brand-400" /> On-Chain Assets
                    </h3>
                    <span className="text-[10px] font-black bg-brand-500/10 text-brand-400 px-2 py-1 rounded-md uppercase tracking-widest border border-brand-500/20">
                        Live via Helius DAS
                    </span>
                </div>

                {portfolio.loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
                        <Loader2 size={32} className="animate-spin text-brand-400" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Indexing wallet contents...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-2">
                        {portfolio.tokens.slice(0, 5).map((token) => (
                            <div key={token.mint} className="flex items-center justify-between p-3 rounded-xl bg-surface-900/40 hover:bg-surface-800/60 transition-all border border-transparent hover:border-surface-700 group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-surface-800 flex items-center justify-center overflow-hidden border border-surface-700 group-hover:border-brand-500/40 transition-colors">
                                        {token.icon && token.icon.startsWith('http') ? (
                                            <img src={token.icon} alt={token.symbol} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-xs font-bold">{token.symbol[0]}</span>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-sm text-white">{token.name}</h4>
                                        <p className="text-[10px] text-surface-500 font-bold uppercase tracking-widest">{token.symbol}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-sm text-white italic">{token.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
                                    <p className="text-[10px] text-accent-green font-black uppercase tracking-widest">${token.valueUSD.toFixed(2)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
              </div>

              {/* ─── Level 3: NFT Proof of Support ─── */}
              {portfolio.nfts.length > 0 && (
                <div className="glass-card p-6 border-accent-purple/10">
                    <h3 className="text-lg font-black italic uppercase tracking-tighter flex items-center gap-2 mb-6">
                        <ImageIcon size={18} className="text-accent-purple" /> Digital Collectibles
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {portfolio.nfts.slice(0, 4).map((nft) => (
                            <div key={nft.id} className="group relative aspect-square rounded-2xl overflow-hidden border border-surface-800 bg-surface-900 shadow-xl hover:border-accent-purple/50 transition-all">
                                <img src={nft.image} alt={nft.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                    <p className="text-[10px] font-black text-white truncate">{nft.name}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
              )}
          </div>

          <div className="space-y-6">
              {/* ─── Recent Tips Ledger ─── */}
              <div className="glass-card p-6 border-brand-500/10">
                <h3 className="text-sm font-black italic uppercase tracking-widest flex items-center gap-2 mb-6 text-surface-400">
                    <Clock size={16} /> Latest Earnings
                </h3>
                {tipsReceived.length === 0 ? (
                    <div className="text-center py-10 opacity-30">
                        <Gift size={32} className="mx-auto mb-3" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No activity found</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {tipsReceived.slice(0, 5).map((tip, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-surface-800/40 hover:bg-surface-800/60 transition-colors border border-surface-700/50">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-accent-green/10 flex items-center justify-center">
                                    <ArrowDownLeft size={14} className="text-accent-green" />
                                </div>
                                <div>
                                    <p className="font-black text-xs italic">{tip.sender}</p>
                                    <p className="text-[9px] text-surface-500 font-bold uppercase tracking-widest">{tip.inputAmount} {tip.inputToken}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-black text-xs text-accent-green italic tracking-tighter">+${tip.amountUSDC.toFixed(2)}</p>
                            </div>
                        </div>
                        ))}
                        <button 
                            onClick={() => window.location.hash = 'history'}
                            className="w-full py-3 rounded-xl border border-surface-800 text-[10px] font-black uppercase tracking-widest text-surface-500 hover:text-white hover:border-surface-600 transition-all mt-2"
                        >
                            View All History
                        </button>
                    </div>
                )}
              </div>

              {/* ─── Share Kit ─── */}
              <div className="glass-card p-6 bg-brand-500/5 border-brand-500/20 group cursor-pointer hover:bg-brand-500/10 transition-all">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand-500 flex items-center justify-center text-black shadow-lg shadow-brand-500/20 group-hover:scale-110 transition-transform">
                            <QrCode size={24} />
                        </div>
                        <div>
                            <h4 className="font-black italic uppercase tracking-tighter text-lg">Creator Kit</h4>
                            <p className="text-[10px] text-brand-400 font-black uppercase tracking-widest">Generate QR & Links</p>
                        </div>
                    </div>
                    <p className="text-xs text-surface-400 leading-relaxed font-medium mb-4">
                        Your professional Solflare-optimized tipping page is ready to accept tips.
                    </p>
                    <button className="w-full py-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
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
