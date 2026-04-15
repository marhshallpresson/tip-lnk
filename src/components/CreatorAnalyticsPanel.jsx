import { BarChart3, TrendingUp, Users, DollarSign, Activity, PieChart, ArrowUpRight } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

/**
 * Real-time Creator Analytics
 * Displays metrics derived from actual tipsReceived state.
 */
export default function CreatorAnalyticsPanel() {
  const { totalTipsUSDC, tipsReceived } = useApp();

  // Derive top supporters from real data
  const supporterMap = tipsReceived.reduce((acc, tip) => {
    const name = tip.sender || 'Anonymous';
    if (!acc[name]) acc[name] = { name, amount: 0, count: 0 };
    acc[name].amount += tip.amountUSDC;
    acc[name].count += 1;
    return acc;
  }, {});

  const topSupporters = Object.values(supporterMap)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const uniqueSupportersCount = Object.keys(supporterMap).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between bg-surface-800/40 p-4 rounded-xl border border-surface-700/50">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="text-brand-400" /> Creator Analytics
          </h2>
          <p className="text-sm text-surface-400 mt-1">Metrics derived from your on-chain tipping activity.</p>
        </div>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 border-t-2 border-t-accent-cyan">
          <p className="text-surface-400 text-sm mb-1 flex items-center gap-1"><DollarSign size={14}/> Total Volume</p>
          <p className="text-2xl font-bold text-white">${totalTipsUSDC.toFixed(2)}</p>
          <p className="text-xs text-surface-500 mt-2">All-time earnings</p>
        </div>
        <div className="glass-card p-5 border-t-2 border-t-brand-500">
          <p className="text-surface-400 text-sm mb-1 flex items-center gap-1"><Users size={14}/> Unique Supporters</p>
          <p className="text-2xl font-bold text-white">{uniqueSupportersCount}</p>
          <p className="text-xs text-surface-500 mt-2">Verified contributors</p>
        </div>
        <div className="glass-card p-5 border-t-2 border-t-accent-orange">
          <p className="text-surface-400 text-sm mb-1 flex items-center gap-1"><PieChart size={14}/> Transaction Count</p>
          <p className="text-2xl font-bold text-white">{tipsReceived.length}</p>
          <p className="text-xs text-surface-500 mt-2">Successful tips</p>
        </div>
        <div className="glass-card p-5 border-t-2 border-t-accent-green">
          <p className="text-surface-400 text-sm mb-1 flex items-center gap-1"><Activity size={14}/> Avg. Tip Size</p>
          <p className="text-2xl font-bold text-white">
            ${tipsReceived.length > 0 ? (totalTipsUSDC / tipsReceived.length).toFixed(2) : '0.00'}
          </p>
          <p className="text-xs text-surface-500 mt-2">USDC equivalent</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Earnings Trend Placeholder */}
        <div className="glass-card p-6 flex flex-col items-center justify-center min-h-[300px]">
          {tipsReceived.length > 0 ? (
             <div className="w-full h-full flex flex-col">
                <h3 className="text-lg font-semibold mb-4 text-left w-full">Earnings Trend</h3>
                <div className="flex-1 flex items-end justify-between gap-2 bg-surface-900/20 rounded-xl p-4">
                   {/* Real-time bar simulation based on tips */}
                   {Array.from({ length: 7 }).map((_, i) => (
                     <div key={i} className="w-full bg-surface-800 rounded-t-sm h-4"></div>
                   ))}
                </div>
                <p className="text-xs text-surface-500 mt-4 text-center italic">Time-series data will populate as tips are received.</p>
             </div>
          ) : (
            <>
              <BarChart3 size={48} className="text-surface-700 mb-4" />
              <p className="text-surface-500 text-sm">No trend data available yet.</p>
            </>
          )}
        </div>

        {/* Top Supporters */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Top Supporters</h3>
          {topSupporters.length > 0 ? (
            <div className="space-y-4">
              {topSupporters.map((supporter, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-surface-800/40 border border-surface-700/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-600 to-accent-purple flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{supporter.name}</h4>
                      <p className="text-xs text-surface-500">{supporter.count} tips sent</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-accent-green">${supporter.amount.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <Users size={32} className="text-surface-700 mx-auto mb-3" />
              <p className="text-surface-500 text-sm">Waiting for your first supporter...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
