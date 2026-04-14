import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useApp } from '../contexts/AppContext';
import useWalletPortfolio from '../hooks/useWalletPortfolio';
import useTransactionHistory from '../hooks/useTransactionHistory';
import useTransactionSimulation from '../hooks/useTransactionSimulation';
import TipWidget from './TipWidget';
import KaminoPanel from './KaminoPanel';
import PayoutPanel from './PayoutPanel';
import CreatorAnalyticsPanel from './CreatorAnalyticsPanel';
import WorkspaceVoucherPanel from './WorkspaceVoucherPanel';
import ShareQRPanel from './ShareQRPanel';
import {
  Wallet, Globe, Image, DollarSign, TrendingUp, Copy, Check, LogOut,
  BarChart3, Gift, ArrowRight, RefreshCw, Zap, Eye, Send, AlertCircle,
  ArrowUpRight, ArrowDownLeft, Repeat, MoreHorizontal, QrCode, Share2,
  ExternalLink, Clock, CheckCircle, XCircle, Loader2, CreditCard,
  Ticket, PieChart,
} from 'lucide-react';

export default function Dashboard() {
  const { publicKey, disconnect } = useWallet();
  const { profile, totalTipsUSDC, tipsReceived, resetOnboarding } = useApp();
  const [activeTab, setActiveTab] = useState('overview');
  const [copied, setCopied] = useState(false);

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

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'portfolio', label: 'Portfolio', icon: Wallet },
    { id: 'tips', label: 'Tip Jar', icon: Gift },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'simulate', label: 'Simulate', icon: Eye },
    { id: 'kamino', label: 'Kamino', icon: TrendingUp },
    { id: 'payouts', label: 'Payouts', icon: CreditCard },
    { id: 'vouchers', label: 'Vouchers', icon: Ticket },
    { id: 'analytics', label: 'Analytics', icon: PieChart },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="glass-card p-5 sm:p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface-800 shrink-0 ring-2 ring-brand-500/20">
            {profile.nftAvatar?.image && !profile.nftAvatar.image.includes('placeholder') ? (
              <img src={profile.nftAvatar.image} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-600/30 to-brand-800/20">
                <Image size={20} className="text-surface-500" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold">{profile.solDomain || profile.displayName || 'Creator'}</h1>
              {profile.solDomain && <span className="badge-brand">SNS</span>}
              {profile.nftAvatar?.isDoodle && <span className="badge-warning">★ Doodles</span>}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-surface-400 font-mono text-sm">{shortAddress}</span>
              <button onClick={copyAddress} className="text-surface-500 hover:text-surface-300 transition-colors">
                {copied ? <Check size={14} className="text-accent-green" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`https://solscan.io/account/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-xs !px-3 !py-2 flex items-center gap-1"
          >
            Solscan <ExternalLink size={10} />
          </a>
          <button onClick={handleDisconnect} className="btn-secondary flex items-center gap-2 text-sm !px-3 !py-2">
            <LogOut size={14} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-btn flex items-center gap-1.5 whitespace-nowrap ${activeTab === tab.id ? 'tab-btn-active' : ''}`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'portfolio' && <PortfolioTab />}
      {activeTab === 'tips' && <TipWidget />}
      {activeTab === 'history' && <TransactionHistoryTab />}
      {activeTab === 'simulate' && <SimulationTab />}
      {activeTab === 'kamino' && <KaminoPanel />}
      {activeTab === 'payouts' && <PayoutPanel />}
      {activeTab === 'vouchers' && <WorkspaceVoucherPanel />}
      {activeTab === 'analytics' && <CreatorAnalyticsPanel />}
    </div>
  );
}

/* ─── Overview Tab ─── */
function OverviewTab() {
  const { totalTipsUSDC, tipsReceived, profile } = useApp();
  const portfolio = useWalletPortfolio();

  const stats = [
    { label: 'Portfolio Value', value: portfolio.loading ? '...' : `$${portfolio.totalValueUSD.toFixed(0)}`, icon: Wallet, color: 'text-brand-400', bgColor: 'bg-brand-600/10' },
    { label: 'Tips Earned', value: `$${totalTipsUSDC.toFixed(2)}`, icon: DollarSign, color: 'text-accent-green', bgColor: 'bg-accent-green/10' },
    { label: 'Tip Count', value: tipsReceived.length, icon: Gift, color: 'text-accent-purple', bgColor: 'bg-accent-purple/10' },
    { label: 'SOL Balance', value: portfolio.loading ? '...' : `${portfolio.solBalance.toFixed(3)} ◎`, icon: Zap, color: 'text-accent-cyan', bgColor: 'bg-accent-cyan/10' },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center mb-3`}>
              <stat.icon size={18} className={stat.color} />
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-surface-500 text-sm mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Tips */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Gift size={18} className="text-brand-400" /> Recent Tips
        </h3>
        {tipsReceived.length === 0 ? (
          <div className="text-center py-10">
            <Gift size={32} className="text-surface-700 mx-auto mb-3" />
            <p className="text-surface-500 text-sm">No tips yet. Share your tip page to start receiving.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tipsReceived.slice(0, 5).map((tip, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-surface-800/40 hover:bg-surface-800/60 transition-colors">
                <div className="flex items-center gap-3">
                  <ArrowDownLeft size={14} className="text-accent-green" />
                  <div>
                    <p className="font-medium text-sm">{tip.sender}</p>
                    <p className="text-surface-500 text-xs">{tip.inputAmount} {tip.inputToken}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-accent-green text-sm">+${tip.amountUSDC.toFixed(2)}</p>
                  <p className="text-surface-600 text-xs">{new Date(tip.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card-hover p-5 cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600/10 flex items-center justify-center">
              <Share2 size={16} className="text-brand-400" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Share Tip Page</h4>
              <p className="text-surface-500 text-xs">Copy your link</p>
            </div>
          </div>
        </div>
        <div className="glass-card-hover p-5 cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-cyan/10 flex items-center justify-center">
              <QrCode size={16} className="text-accent-cyan" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">QR Code</h4>
              <p className="text-surface-500 text-xs">Scan-to-Reward</p>
            </div>
          </div>
        </div>
        <div className="glass-card-hover p-5 cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-purple/10 flex items-center justify-center">
              <TrendingUp size={16} className="text-accent-purple" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Kamino Vaults</h4>
              <p className="text-surface-500 text-xs">Grow earnings</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5 mt-6">
        <ShareQRPanel />
      </div>
    </div>
  );
}

/* ─── Portfolio Tab (Solflare Track) ─── */
function PortfolioTab() {
  const { solBalance, tokens, nfts, totalValueUSD, loading, refresh } = useWalletPortfolio();

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="glass-card p-6 flex items-center justify-between">
        <div>
          <p className="text-surface-400 text-sm mb-1">Total Portfolio Value</p>
          <p className="text-3xl font-bold">{loading ? '...' : `$${totalValueUSD.toFixed(2)}`}</p>
        </div>
        <button onClick={refresh} className="btn-secondary !px-3 !py-2 flex items-center gap-1.5 text-xs">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Token Holdings */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Wallet size={18} className="text-brand-400" /> Token Holdings
        </h3>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-surface-500" />
          </div>
        ) : (
          <div className="space-y-2">
            {tokens.map((token) => (
              <div key={token.mint} className="flex items-center justify-between p-3 rounded-xl bg-surface-800/40 hover:bg-surface-800/60 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{token.icon}</span>
                  <div>
                    <p className="font-medium text-sm">{token.symbol}</p>
                    <p className="text-surface-500 text-xs">{token.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm">{typeof token.balance === 'number' && token.balance > 1000 ? token.balance.toLocaleString() : token.balance}</p>
                  <p className="text-surface-400 text-xs">${token.valueUSD.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* NFTs */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Image size={18} className="text-accent-purple" /> NFT Collection
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {nfts.map((nft, i) => (
            <div key={i} className="home-card p-4 text-center">
              <div className="w-full aspect-square rounded-xl bg-surface-800 flex items-center justify-center mb-3">
                <Image size={24} className="text-surface-600" />
              </div>
              <p className="font-medium text-xs truncate">{nft.name}</p>
              <p className="text-surface-500 text-xs">{nft.collection}</p>
              {nft.isDoodle && <span className="badge-brand text-xs mt-1">Doodle ★</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Transaction History Tab (Solflare Track) ─── */
function TransactionHistoryTab() {
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
                  <p className="text-surface-600 text-xs">
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

/* ─── Simulation Tab (Solflare Track) ─── */
function SimulationTab() {
  const { result, loading, error, simulateTransfer, clearSimulation } = useTransactionSimulation();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');

  const handleSimulate = () => {
    if (recipient && amount) {
      simulateTransfer(recipient, parseFloat(amount));
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Eye size={18} className="text-brand-400" /> Transaction Simulator
        </h3>
        <p className="text-surface-400 text-sm mb-6">
          Preview transaction outcomes before signing. See balance changes, fees, and error conditions — no funds leave your wallet.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-surface-400 font-medium mb-1.5 block">Recipient Address</label>
            <input
              type="text"
              className="input-field w-full font-mono text-sm"
              placeholder="Enter Solana address..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-surface-400 font-medium mb-1.5 block">Amount (SOL)</label>
            <input
              type="number"
              className="input-field w-full"
              placeholder="0.01"
              step="0.001"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSimulate}
              disabled={!recipient || !amount || loading}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
              Simulate Transaction
            </button>
            {result && (
              <button onClick={clearSimulation} className="btn-secondary !px-4">
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Simulation Result */}
      {error && (
        <div className="glass-card p-6 border-accent-red/40">
          <div className="flex items-center gap-2 text-accent-red mb-2">
            <AlertCircle size={16} />
            <span className="font-semibold text-sm">Simulation Error</span>
          </div>
          <p className="text-surface-400 text-sm">{error}</p>
        </div>
      )}

      {result && (
        <div className={`glass-card p-6 ${result.success ? 'border-accent-green/30' : 'border-accent-red/30'} border`}>
          <div className="flex items-center gap-2 mb-4">
            {result.success ? (
              <CheckCircle size={18} className="text-accent-green" />
            ) : (
              <XCircle size={18} className="text-accent-red" />
            )}
            <span className={`font-bold ${result.success ? 'text-accent-green' : 'text-accent-red'}`}>
              {result.success ? 'Simulation Passed' : 'Simulation Failed'}
            </span>
          </div>

          <div className="space-y-3 bg-surface-900/40 rounded-xl p-4">
            <div className="flex justify-between text-sm">
              <span className="text-surface-400">Amount</span>
              <span className="font-medium">{result.amount} SOL</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-surface-400">Estimated Fee</span>
              <span className="font-mono text-xs">{result.estimatedFee} SOL</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-surface-400">Balance Change</span>
              <span className="text-accent-red font-medium">{result.balanceChange.toFixed(6)} SOL</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-surface-400">Compute Units</span>
              <span className="font-mono text-xs">{result.unitsConsumed.toLocaleString()}</span>
            </div>
          </div>

          {result.logs && result.logs.length > 0 && (
            <details className="mt-4">
              <summary className="text-xs text-surface-500 cursor-pointer hover:text-surface-300 transition-colors">
                View Program Logs ({result.logs.length})
              </summary>
              <div className="mt-2 bg-surface-900/60 rounded-lg p-3 max-h-40 overflow-y-auto">
                {result.logs.map((log, i) => (
                  <p key={i} className="text-xs font-mono text-surface-400 leading-relaxed">{log}</p>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
