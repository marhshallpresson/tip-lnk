import { useState } from 'react';
import { useDFlow } from '../hooks/useDFlow';
import { 
  ArrowRightLeft, 
  Search, 
  ArrowDown, 
  TrendingUp, 
  ShieldAlert, 
  ShieldCheck,
  RefreshCw,
  Info
} from 'lucide-react';

export default function SwapPanel() {
  const { loading, routes, risks, findBestRoute, executeSwap, clearRisks } = useDFlow();
  const [fromAmount, setFromAmount] = useState('');
  const [selectedRoute, setSelectedRoute] = useState(null);

  const handleSearch = async () => {
    if (!fromAmount) return;
    const foundRoutes = await findBestRoute('USDC', 'SOL', parseFloat(fromAmount));
    setSelectedRoute(foundRoutes[1]); // Default to optimal split route
  };

  const handleSwap = async () => {
    if (!selectedRoute) return;
    try {
      await executeSwap(selectedRoute);
      alert('Swap Successful!');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between bg-gradient-to-r from-accent-cyan/20 to-transparent p-4 rounded-xl border border-accent-cyan/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-cyan/20 flex items-center justify-center text-accent-cyan">
            <ArrowRightLeft size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold">DFlow Routing</h2>
            <p className="text-sm text-surface-400">Optimal liquidity routing for secure swaps.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-surface-400">From (USDC)</label>
            <div className="relative">
              <input 
                type="number" 
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                placeholder="0.00"
                className="input-field w-full pl-10"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500">💵</span>
            </div>
          </div>

          <div className="flex justify-center -my-2 relative z-10">
            <div className="bg-surface-800 border border-surface-700 p-2 rounded-full text-brand-400 shadow-lg">
              <ArrowDown size={16} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-surface-400">To (SOL)</label>
            <div className="relative">
              <input 
                type="text" 
                readOnly
                value={selectedRoute ? selectedRoute.outAmount.toFixed(4) : ''}
                placeholder="0.00"
                className="input-field w-full pl-10 bg-surface-900/50 cursor-not-allowed"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500">◎</span>
            </div>
          </div>

          <button 
            onClick={handleSearch}
            disabled={loading || !fromAmount}
            className="btn-secondary w-full py-4 flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18} />}
            Find Best Route
          </button>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-surface-400 uppercase tracking-widest px-1">Route Comparison</h3>
          
          {routes.length > 0 ? (
            <div className="space-y-3">
              {routes.map((route) => (
                <button 
                  key={route.id}
                  onClick={() => setSelectedRoute(route)}
                  className={`glass-card p-4 w-full text-left transition-all border-2 ${selectedRoute?.id === route.id ? 'border-accent-cyan shadow-[0_0_15px_rgba(45,212,191,0.2)]' : 'border-transparent'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-white">{route.name}</span>
                    <span className="text-accent-cyan font-mono text-xs">{route.outAmount.toFixed(4)} SOL</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-surface-500">
                    {route.path.join(' → ')} • Impact: {route.priceImpact}%
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="glass-card p-10 text-center border-dashed border-surface-700">
              <Info size={24} className="mx-auto text-surface-600 mb-2" />
              <p className="text-surface-500 text-sm">Enter an amount to see routing options</p>
            </div>
          )}

          {risks.length > 0 && (
            <div className="bg-accent-red/10 border border-accent-red/30 p-4 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-accent-red font-bold text-sm">
                <ShieldAlert size={16} />
                Routing Risk Analysis
              </div>
              <div className="space-y-1">
                {risks.map((risk, i) => (
                  <p key={i} className="text-xs text-accent-red/80 flex items-center gap-1">• {risk.message}</p>
                ))}
              </div>
            </div>
          )}

          {selectedRoute && (
            <button 
              onClick={handleSwap}
              disabled={loading}
              className="btn-primary w-full py-4 bg-gradient-to-r from-accent-cyan to-brand-500 border-none shadow-lg shadow-accent-cyan/20 flex items-center justify-center gap-2"
            >
              <ShieldCheck size={18} />
              {loading ? 'Executing...' : 'Confirm Secure Swap'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
