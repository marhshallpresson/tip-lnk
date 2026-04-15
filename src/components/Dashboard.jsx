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
import SwapPanel from './SwapPanel';
import {
  Wallet, Globe, Image as ImageIcon, DollarSign, TrendingUp, Copy, Check, LogOut,
  BarChart3, Gift, ArrowRight, RefreshCw, Zap, Eye, Send, AlertCircle,
  ArrowUpRight, ArrowDownLeft, Repeat, MoreHorizontal, QrCode, Share2,
  ExternalLink, Clock, CheckCircle, XCircle, Loader2, CreditCard,
  Ticket, PieChart, Shield, ShieldCheck, Vault, ArrowRightLeft, Code as CodeIcon
} from 'lucide-react';

import ReferralModal from './ReferralModal';
import EmbedGenerator from './EmbedGenerator';

export default function Dashboard() {
  const { publicKey, disconnect } = useWallet();
  const { profile, resetOnboarding } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [copied, setCopied] = useState(false);
  const [isReferralOpen, setIsReferralOpen] = useState(false);

  const address = publicKey?.toBase58() || '';
  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDisconnect = () => {
    disconnect();
    resetOnboarding();
  };

  const menuItems = [
    { id: 'overview', label: 'My assets', icon: Wallet },
    { id: 'embed', label: 'Share & Embed', icon: CodeIcon },
    { id: 'analytics', label: 'Explore', icon: Globe },
    { id: 'history', label: 'Transactions', icon: Clock },
    { id: 'yield', label: 'Savings', icon: TrendingUp },
    { id: 'settings', label: 'Settings', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-main-bg text-white font-sans flex flex-col md:flex-row">
      <ReferralModal 
        isOpen={isReferralOpen} 
        onClose={() => setIsReferralOpen(false)} 
        referralCode={profile.referralCode}
      />

      {/* Professional Sidebar */}
      <aside className="w-full md:w-72 bg-main-bg border-r border-surface-900 p-6 flex flex-col shrink-0">
        <div className="flex items-center gap-2 mb-10 px-2">
          <div className="w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center">
             <Zap size={20} className="text-brand-500" />
          </div>
          <span className="text-xl font-black tracking-tight">Personal</span>
        </div>

        <nav className="flex-1 space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname.includes(item.id) || (item.id === 'overview' && location.pathname === '/dashboard');
            return (
              <button
                key={item.id}
                onClick={() => navigate(`/dashboard/${item.id === 'overview' ? '' : item.id}`)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm ${
                  isActive 
                    ? 'bg-surface-900 text-white' 
                    : 'text-surface-500 hover:text-white hover:bg-surface-950'
                }`}
              >
                <item.icon size={20} className={isActive ? 'text-brand-500' : ''} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-surface-900">
           <button onClick={handleDisconnect} className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-surface-500 hover:text-white transition-all font-bold text-sm">
             <LogOut size={20} />
             Logout
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <header className="h-20 border-b border-surface-900 px-8 flex items-center justify-between sticky top-0 bg-main-bg z-20">
          <div className="md:hidden flex items-center gap-2">
             <Zap size={20} className="text-brand-500" />
             <span className="font-black">TipLnk</span>
          </div>
          
          <div className="hidden md:flex flex-1 max-w-md">
            {/* Search Placeholder like Busha */}
            <div className="w-full bg-surface-900 border border-surface-800 rounded-full px-4 h-11 flex items-center gap-3 text-surface-500">
               <Globe size={18} />
               <span className="text-sm">Search assets, creators...</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2.5 rounded-full hover:bg-surface-900 text-surface-400 transition-all">
              <Clock size={20} />
            </button>
            <button className="p-2.5 rounded-full hover:bg-surface-900 text-surface-400 transition-all">
              <Zap size={20} />
            </button>
            
            <div className="h-10 w-px bg-surface-900 mx-2" />

            <div className="flex items-center gap-3 pl-2 cursor-pointer group">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold leading-tight group-hover:text-brand-400 transition-colors">{profile.displayName || 'Creator'}</p>
                <p className="text-[10px] text-surface-500 font-mono mt-0.5">{shortAddress}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-surface-900 border border-surface-800 flex items-center justify-center overflow-hidden">
                {profile.nftAvatar?.image ? (
                   <img src={profile.nftAvatar.image} alt="" className="w-full h-full object-cover" />
                ) : (
                   <ImageIcon size={18} className="text-surface-700" />
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="p-8">
          <Routes>
            <Route index element={<OverviewTab onInvite={() => setIsReferralOpen(true)} />} />
            <Route path="overview" element={<OverviewTab onInvite={() => setIsReferralOpen(true)} />} />
            <Route path="embed" element={<EmbedGenerator handle={profile.handle} profileUrl={`${window.location.origin}/u/${profile.handle}`} />} />
            <Route path="analytics" element={<CreatorAnalyticsPanel />} />
            <Route path="history" element={<TransactionHistoryTab />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

/* ─── Overview Tab ─── */
export function OverviewTab({ onInvite }) {
  const { totalTipsUSDC, profile } = useApp();
  const portfolio = useWalletPortfolio();

  const accountCards = [
    { 
      id: 'personal', 
      title: 'Personal details', 
      desc: 'Review and update your personal info', 
      icon: Users, 
      badge: 'Verified',
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
    { 
      id: 'limits', 
      title: 'Account limits', 
      desc: 'Know your spending limits', 
      icon: Shield, 
      color: 'text-accent-orange'
    },
    { 
      id: 'statement', 
      title: 'Wallet statement', 
      desc: 'Your financial history readily available', 
      icon: FileJson, 
      color: 'text-accent-green'
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

      {/* Asset Overview Section like Busha Screenshot 3 */}
      <section>
        <div className="flex items-center justify-between mb-6">
           <h2 className="text-xl font-bold">My Assets</h2>
           <div className="flex bg-surface-900 rounded-full p-1">
             <button className="px-4 py-1.5 rounded-full bg-brand-500 text-black text-xs font-bold">Cash</button>
             <button className="px-4 py-1.5 rounded-full text-surface-500 text-xs font-bold">Crypto</button>
           </div>
        </div>

        <div className="bg-surface-900 border border-surface-800 rounded-[24px] overflow-hidden">
          <div className="p-8 border-b border-surface-800 bg-surface-950/30">
            <p className="text-xs font-bold text-surface-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              Total Balance <Eye size={14} />
            </p>
            <h3 className="text-4xl font-black">
              ${Number(portfolio.totalValueUSD + totalTipsUSDC).toFixed(2)} 
              <span className="text-surface-500 text-lg ml-2 font-medium">USDC</span>
            </h3>

            <div className="flex gap-3 mt-8">
               <button className="flex-1 btn-primary !h-12 !py-0 flex items-center justify-center gap-2">
                 <ArrowUpRight size={18} /> Trade
               </button>
               <button className="flex-1 btn-secondary !h-12 !py-0 flex items-center justify-center gap-2">
                 <ArrowDownLeft size={18} /> Deposit
               </button>
               <button className="flex-1 btn-secondary !h-12 !py-0 flex items-center justify-center gap-2">
                 <Send size={18} /> Send
               </button>
            </div>
          </div>

          <div className="p-4 space-y-2">
            <AssetRow 
              name="USDC" 
              label="USD Coin" 
              balance={totalTipsUSDC.toFixed(2)} 
              value={`$${totalTipsUSDC.toFixed(2)}`} 
              icon="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png"
            />
            <AssetRow 
              name="SOL" 
              label="Solana" 
              balance={portfolio.solBalance.toFixed(3)} 
              value={`$${(portfolio.solBalance * 150).toFixed(2)}`} // Mock price
              icon="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
            />
          </div>
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

