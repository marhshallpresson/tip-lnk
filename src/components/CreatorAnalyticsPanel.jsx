import { BarChart3, TrendingUp, Users, DollarSign, Activity, PieChart, ArrowUpRight } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

export default function CreatorAnalyticsPanel() {
  const { totalTipsUSDC, tipsReceived } = useApp();

  const topSupporters = [
    { name: 'Alice.sol', amount: 150, count: 5 },
    { name: 'Bob', amount: 85, count: 2 },
    { name: 'Charlie', amount: 45, count: 3 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between bg-surface-800/40 p-4 rounded-xl border border-surface-700/50">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="text-brand-400" /> Creator Analytics
          </h2>
          <p className="text-sm text-surface-400 mt-1">Track your engagement, tip volume, and supporter metrics over time.</p>
        </div>
        <div className="hidden sm:block text-right">
          <p className="text-xs text-surface-500 uppercase tracking-wider font-semibold">Last 30 Days</p>
          <p className="text-brand-400 font-bold flex items-center gap-1 justify-end mt-1">
            <TrendingUp size={14} /> +24.5%
          </p>
        </div>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 border-t-2 border-t-accent-cyan">
          <p className="text-surface-400 text-sm mb-1 flex items-center gap-1"><DollarSign size={14}/> Total Volume</p>
          <p className="text-2xl font-bold text-white">${totalTipsUSDC.toFixed(2)}</p>
          <p className="text-xs text-accent-green mt-2 flex items-center gap-1"><ArrowUpRight size={12}/> +12% vs last month</p>
        </div>
        <div className="glass-card p-5 border-t-2 border-t-accent-purple">
          <p className="text-surface-400 text-sm mb-1 flex items-center gap-1"><Activity size={14}/> Total Tips</p>
          <p className="text-2xl font-bold text-white">{tipsReceived.length}</p>
          <p className="text-xs text-accent-green mt-2 flex items-center gap-1"><ArrowUpRight size={12}/> +5% vs last month</p>
        </div>
        <div className="glass-card p-5 border-t-2 border-t-brand-500">
          <p className="text-surface-400 text-sm mb-1 flex items-center gap-1"><Users size={14}/> Unique Supporters</p>
          <p className="text-2xl font-bold text-white">12</p>
          <p className="text-xs text-surface-500 mt-2">3 new this week</p>
        </div>
        <div className="glass-card p-5 border-t-2 border-t-accent-orange">
          <p className="text-surface-400 text-sm mb-1 flex items-center gap-1"><PieChart size={14}/> Avg. Tip Size</p>
          <p className="text-2xl font-bold text-white">${tipsReceived.length > 0 ? (totalTipsUSDC / tipsReceived.length).toFixed(2) : '0.00'}</p>
          <p className="text-xs text-surface-500 mt-2">Consistent</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mock Chart Area */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Earnings Trend</h3>
          <div className="h-48 w-full flex items-end justify-between gap-2">
            {[40, 20, 60, 80, 50, 90, 70].map((h, i) => (
              <div key={i} className="w-full bg-surface-800 rounded-t-sm relative group">
                <div 
                  className="absolute bottom-0 w-full bg-brand-500/50 group-hover:bg-brand-500 transition-colors rounded-t-sm"
                  style={{ height: `${h}%` }}
                ></div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-surface-500">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>
        </div>

        {/* Top Supporters */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Top Supporters</h3>
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
                  <p className="font-bold text-accent-green">${supporter.amount}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
