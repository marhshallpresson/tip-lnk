import { useApp } from '../contexts/AppContext';

export default function CreatorAnalyticsPanel() {
  const { totalTipsUSDC, tipsReceived } = useApp();

  return (
    <div className="space-y-6 animate-fade-in pb-20 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-bold">Analytics</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[#111111] border border-white/10 rounded-2xl p-6">
          <p className="text-sm font-medium text-white/60 mb-2">Avg. Tip Size</p>
          <p className="text-3xl font-bold tracking-tight">
            ${tipsReceived.length > 0 ? (totalTipsUSDC / tipsReceived.length).toFixed(2) : '0.00'}
          </p>
        </div>
        <div className="bg-[#111111] border border-white/10 rounded-2xl p-6">
          <p className="text-sm font-medium text-white/60 mb-2">Total Tips</p>
          <p className="text-3xl font-bold tracking-tight">{tipsReceived.length}</p>
        </div>
      </div>

      <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[300px]">
        {tipsReceived.length > 0 ? (
           <div className="w-full h-full flex flex-col">
              <div className="flex-1 flex items-end justify-between gap-4">
                 {Array.from({ length: 12 }).map((_, i) => (
                   <div key={i} className="w-full bg-brand-500/20 hover:bg-brand-500 rounded-t-sm h-4 transition-all hover:h-full"></div>
                 ))}
              </div>
           </div>
        ) : (
          <p className="text-sm text-white/40">No data available yet.</p>
        )}
      </div>
    </div>
  );
}
