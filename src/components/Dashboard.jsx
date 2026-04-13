import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useApp } from '../contexts/AppContext';
import {
  Wallet,
  Globe,
  Image,
  DollarSign,
  TrendingUp,
  ExternalLink,
  Copy,
  Check,
  LogOut,
  BarChart3,
  Gift,
  ArrowRight,
} from 'lucide-react';
import TipWidget from './TipWidget';
import KaminoPanel from './KaminoPanel';

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
    { id: 'tips', label: 'Tip Jar', icon: Gift },
    { id: 'kamino', label: 'Kamino Vaults', icon: TrendingUp },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="glass-card p-6 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface-800 shrink-0">
            {profile.nftAvatar?.image && !profile.nftAvatar.image.includes('placeholder') ? (
              <img
                src={profile.nftAvatar.image}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Image size={20} className="text-surface-600" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">
                {profile.solDomain || profile.displayName || 'Creator'}
              </h1>
              {profile.solDomain && (
                <span className="bg-brand-600/20 text-brand-400 text-xs font-mono px-2 py-0.5 rounded-md">
                  SNS
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-surface-400 font-mono text-sm">{shortAddress}</span>
              <button
                onClick={copyAddress}
                className="text-surface-500 hover:text-surface-300 transition-colors"
              >
                {copied ? <Check size={14} className="text-accent-green" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {profile.nftAvatar?.isDoodle && (
            <span className="bg-accent-orange/20 text-accent-orange text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
              ★ Doodles Holder
            </span>
          )}
          <button
            onClick={handleDisconnect}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <LogOut size={14} />
            Disconnect
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-brand-600 text-white'
                : 'bg-surface-900 text-surface-400 hover:text-surface-200 hover:bg-surface-800'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'tips' && <TipWidget />}
      {activeTab === 'kamino' && <KaminoPanel />}
    </div>
  );
}

function OverviewTab() {
  const { totalTipsUSDC, tipsReceived, profile } = useApp();

  const stats = [
    {
      label: 'Total Tips',
      value: `$${totalTipsUSDC.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-accent-green',
      bgColor: 'bg-accent-green/10',
    },
    {
      label: 'Tip Count',
      value: tipsReceived.length,
      icon: Gift,
      color: 'text-brand-400',
      bgColor: 'bg-brand-600/10',
    },
    {
      label: 'NFT Avatar',
      value: profile.nftAvatar?.name || 'Not set',
      icon: Image,
      color: 'text-accent-purple',
      bgColor: 'bg-accent-purple/10',
    },
    {
      label: 'Domain',
      value: profile.solDomain || 'Not registered',
      icon: Globe,
      color: 'text-accent-cyan',
      bgColor: 'bg-accent-cyan/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon size={18} className={stat.color} />
              </div>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-surface-500 text-sm mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Tips */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Tips</h3>
        {tipsReceived.length === 0 ? (
          <div className="text-center py-10">
            <Gift size={32} className="text-surface-700 mx-auto mb-3" />
            <p className="text-surface-500">No tips yet. Share your tip page to start receiving.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tipsReceived.slice(0, 5).map((tip, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 rounded-xl bg-surface-800/50"
              >
                <div>
                  <p className="font-medium">{tip.sender}</p>
                  <p className="text-surface-400 text-sm">
                    {tip.inputAmount} {tip.inputToken}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-accent-green">
                    +${tip.amountUSDC.toFixed(2)} USDC
                  </p>
                  <p className="text-surface-500 text-xs">
                    {new Date(tip.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card-hover p-6 cursor-pointer group">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-1">Creator Tip Page</h3>
              <p className="text-surface-400 text-sm">Share with your audience</p>
            </div>
            <ArrowRight
              size={20}
              className="text-surface-600 group-hover:text-brand-400 transition-colors"
            />
          </div>
        </div>
        <div className="glass-card-hover p-6 cursor-pointer group">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-1">Kamino Vaults</h3>
              <p className="text-surface-400 text-sm">Grow your earnings</p>
            </div>
            <ArrowRight
              size={20}
              className="text-surface-600 group-hover:text-brand-400 transition-colors"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
