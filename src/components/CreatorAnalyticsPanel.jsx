import { BarChart3, TrendingUp, Users, DollarSign, Activity, PieChart, ArrowUpRight, Globe, ShieldCheck } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useBirdeye } from '../hooks/useBirdeye';

/**
 * Real-time Creator Analytics
 * Displays metrics derived from actual tipsReceived state and social metrics.
 */
export default function CreatorAnalyticsPanel() {
  const { totalTipsUSDC, tipsReceived, profile } = useApp();
  const { insights, loading: birdeyeLoading } = useBirdeye();

  const totalReach = profile?.socialMetrics?.totalFollowers || 0;

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
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex items-center justify-between bg-[#0c0c0c] p-6 rounded-[24px] border border-white/5">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-3">
            <BarChart3 className="text-brand-500" /> 
            <span className="italic uppercase tracking-tight">Creator Analytics</span>
          </h2>
          <p className="text-xs text-white/40 mt-1 font-medium uppercase tracking-widest">Metrics derived from your on-chain tipping activity.</p>
        </div>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="grass-card !p-5 border-t-2 border-t-accent-cyan">
          <p className="grass-stat-label flex items-center gap-1"><DollarSign size={14}/> Total Volume</p>
          <p className="text-2xl font-bold text-white tracking-tight">${totalTipsUSDC.toFixed(2)}</p>
          <p className="text-[10px] text-white/20 mt-2 font-bold uppercase tracking-widest">All-time earnings</p>
        </div>
        <div className="grass-card !p-5 border-t-2 border-t-brand-500">
          <p className="grass-stat-label flex items-center gap-1"><Users size={14}/> Supporters</p>
          <p className="text-2xl font-bold text-white tracking-tight">{uniqueSupportersCount}</p>
          <p className="text-[10px] text-white/20 mt-2 font-bold uppercase tracking-widest">Verified contributors</p>
        </div>
        <div className="grass-card !p-5 border-t-2 border-t-accent-orange">
          <p className="grass-stat-label flex items-center gap-1"><PieChart size={14}/> Tips</p>
          <p className="text-2xl font-bold text-white tracking-tight">{tipsReceived.length}</p>
          <p className="text-[10px] text-white/20 mt-2 font-bold uppercase tracking-widest">Successful transactions</p>
        </div>
        <div className="grass-card !p-5 border-t-2 border-t-accent-green">
          <p className="grass-stat-label flex items-center gap-1"><Activity size={14}/> Avg. Size</p>
          <p className="text-2xl font-bold text-white tracking-tight">
            ${tipsReceived.length > 0 ? (totalTipsUSDC / tipsReceived.length).toFixed(2) : '0.00'}
          </p>
          <p className="text-[10px] text-white/20 mt-2 font-bold uppercase tracking-widest">USDC equivalent</p>
        </div>
        <div className="grass-card !p-5 border-t-2 border-t-accent-purple">
          <p className="grass-stat-label flex items-center gap-1"><TrendingUp size={14}/> Total Reach</p>
          <p className="text-2xl font-bold text-white tracking-tight">{totalReach.toLocaleString()}</p>
          <p className="text-[10px] text-white/20 mt-2 font-bold uppercase tracking-widest">Social followers</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* --- BIRDEYE MARKET INTELLIGENCE --- */}
        <div className="grass-card p-6 border-t-2 border-t-brand-500 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-5">
                <Globe size={80} />
            </div>
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-bold italic uppercase tracking-tight">Market Intelligence</h3>
                <div className="px-2 py-1 bg-white/5 rounded-md flex items-center gap-1.5 border border-white/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Live via Birdeye</span>
                </div>
            </div>

            {birdeyeLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 size={24} className="animate-spin text-brand-500 mb-2" />
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Scanning Portfolio...</p>
                </div>
            ) : insights ? (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#111111] p-4 rounded-xl border border-white/5">
                            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Portfolio Value</p>
                            <p className="text-xl font-black text-white">${insights.totalUsdValue.toFixed(2)}</p>
                        </div>
                        <div className="bg-[#111111] p-4 rounded-xl border border-white/5">
                            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Sentiment</p>
                            <p className={`text-xl font-black ${insights.marketSentiment === 'Bullish' ? 'text-emerald-500' : 'text-brand-500'}`}>
                                {insights.marketSentiment}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest px-1">Top Holdings</p>
                        {(insights.tokens || []).slice(0, 3).map((token, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-brand-500/10 flex items-center justify-center text-[8px] font-bold text-brand-500">
                                        {token.symbol[0]}
                                    </div>
                                    <span className="text-xs font-bold text-white">{token.symbol}</span>
                                </div>
                                <span className="text-xs font-mono text-white/60">${parseFloat(token.value).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                    
                    <div className="pt-4 flex items-center gap-2 text-emerald-500/60">
                        <ShieldCheck size={12} />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Verified On-Chain Data</span>
                    </div>
                </div>
            ) : (
                <div className="text-center py-12 opacity-20">
                    <Globe size={32} className="mx-auto mb-3" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">Insights Unavailable</p>
                </div>
            )}
        </div>

        <div className="grass-card p-6 flex flex-col items-center justify-center min-h-[300px]">
          {tipsReceived.length > 0 ? (
             <div className="w-full h-full flex flex-col">
                <h3 className="text-lg font-bold mb-8 italic uppercase tracking-tight">Earnings Trend</h3>
                <div className="flex-1 flex items-end justify-between gap-4 bg-[#111111] rounded-2xl p-6">
                   {Array.from({ length: 12 }).map((_, i) => (
                     <div key={i} className="w-full bg-brand-500/20 group-hover:bg-brand-500 rounded-full h-4 transition-all hover:h-full"></div>
                   ))}
                </div>
                <p className="text-[10px] text-white/20 mt-4 text-center font-bold uppercase tracking-widest">Time-series data populating...</p>
             </div>
          ) : (
            <>
              <BarChart3 size={48} className="text-white/10 mb-4" />
              <p className="text-white/40 text-xs font-bold uppercase tracking-widest">No trend data available</p>
            </>
          )}
        </div>

        <div className="grass-card p-6">
          <h3 className="text-lg font-bold mb-8 italic uppercase tracking-tight">Top Supporters</h3>
          {topSupporters.length > 0 ? (
            <div className="space-y-4">
              {topSupporters.map((supporter, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-[18px] bg-[#111111] border border-white/5 hover:border-white/10 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-xs font-bold text-brand-500">
                      #{index + 1}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">{supporter.name}</h4>
                      <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{supporter.count} tips sent</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-brand-500 tracking-tight">${supporter.amount.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 opacity-20">
              <Users size={32} className="mx-auto mb-3" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Waiting for supporters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
