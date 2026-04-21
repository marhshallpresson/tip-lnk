import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { 
  TrendingUp, 
  ArrowUpRight, 
  ShieldCheck, 
  Lock,
  ExternalLink,
  ChevronRight,
  Loader2,
  Trophy
} from 'lucide-react';

export default function KaminoPanel() {
  const { connected } = useWallet();
  const [loading, setLoading] = useState(true);
  const [yieldData, setYieldData] = useState(null);

  useEffect(() => {
    // ─── Professional Yield Simulation ───
    // In production, this would fetch real Kamino K-Token data
    const simulateYield = async () => {
        setLoading(true);
        await new Promise(r => setTimeout(r, 1200));
        setYieldData({
            currentApy: "12.45%",
            totalYieldEarned: "42.80",
            optimizedStrategy: "USDC Multiply",
            protocolSafety: "Elite (9.2/10)"
        });
        setLoading(false);
    };
    if (connected) simulateYield();
  }, [connected]);

  if (!connected) {
    return (
      <div className="bg-[#111111] border border-white/5 rounded-[24px] p-10 text-center">
        <Lock size={32} className="mx-auto mb-4 text-white/10" />
        <h3 className="text-xl font-bold mb-2 text-white">Portfolio Locked</h3>
        <p className="text-white/40 text-sm mb-6 max-w-xs mx-auto">Connect your wallet to enable automated yield strategies via Kamino.</p>
        <button className="btn-secondary !py-2 !px-4 text-xs font-bold uppercase tracking-widest mx-auto">Connect Wallet</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-[#111111] border border-white/5 rounded-[24px] p-24 flex flex-col items-center justify-center">
        <Loader2 size={32} className="animate-spin text-brand-500 mb-4" />
        <p className="text-white/40 font-bold uppercase tracking-[0.2em] text-[10px]">Analyzing Kamino Vaults...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Hero Yield Card */}
      <div className="bg-gradient-to-br from-brand-500/10 via-[#111111] to-[#0a0a0a] border border-brand-500/20 rounded-[32px] p-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Trophy size={120} className="text-brand-500" />
        </div>
        
        <div className="relative z-10">
            <div className="flex items-center gap-2 mb-6 text-white">
                <div className="px-3 py-1 bg-brand-500 text-black text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-brand-500/20">
                    Kamino Active
                </div>
                <div className="px-3 py-1 bg-white/5 text-white/60 text-[10px] font-bold uppercase tracking-widest rounded-full border border-white/10">
                    USDC Multiply
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                <div>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">Estimated Annual Yield</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-6xl font-black italic tracking-tighter text-brand-500">{yieldData.currentApy}</span>
                        <span className="text-white/20 text-xl font-bold italic lowercase tracking-tight">apy</span>
                    </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                        <TrendingUp size={12} className="text-brand-500" /> Current Revenue Gain
                    </p>
                    <p className="text-2xl font-black tracking-tight text-white">${yieldData.totalYieldEarned} USDC</p>
                    <p className="text-[10px] text-white/30 mt-1 italic">Passive interest earned on your tip balance.</p>
                </div>
            </div>
        </div>
      </div>

      {/* Security & Strategy Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#111111] border border-white/5 p-6 rounded-2xl hover:border-white/10 transition-colors text-white">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-accent-cyan/10 flex items-center justify-center text-accent-cyan border border-accent-cyan/10">
                    <ShieldCheck size={20} />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-white/60">Risk Profile</p>
            </div>
            <p className="text-xl font-black tracking-tight">{yieldData.protocolSafety}</p>
            <p className="text-[10px] text-white/40 mt-1 leading-relaxed">Protected by Kamino's professional-grade collateralized infrastructure.</p>
        </div>

        <div className="bg-[#111111] border border-white/5 p-6 rounded-2xl hover:border-white/10 transition-colors group cursor-pointer text-white">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-accent-purple/10 flex items-center justify-center text-accent-purple border border-accent-purple/10">
                    <ArrowUpRight size={20} />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-white/60">Manage Vault</p>
            </div>
            <div className="flex items-center justify-between">
                <p className="text-xl font-black tracking-tight underline underline-offset-4 decoration-accent-purple/40">View on Kamino</p>
                <ChevronRight size={18} className="text-white/20 group-hover:translate-x-1 transition-transform" />
            </div>
        </div>
      </div>
    </div>
  );
}
