import { Ticket, Percent, Plus, ExternalLink, Settings } from 'lucide-react';

export default function WorkspaceVoucherPanel() {
  const vouchers = [
    { id: 1, name: '10% Discount Tier', supply: 100, claimed: 45, discount: 10 },
    { id: 2, name: 'VIP Supporter Access', supply: 50, claimed: 50, discount: 25 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between bg-surface-800/40 p-4 rounded-xl border border-surface-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-orange/20 flex items-center justify-center text-accent-orange">
            <Ticket size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              Workspace Vouchers
            </h2>
            <p className="text-sm text-surface-400">Issue Token-2022 extensions to reward loyal tippers with discounts or access.</p>
          </div>
        </div>
        <button className="btn-primary text-sm flex items-center gap-2">
          <Plus size={16} /> Create Voucher
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {vouchers.map((voucher) => (
          <div key={voucher.id} className="glass-card p-6 border-t-4 border-t-accent-orange relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
              <Ticket size={100} />
            </div>
            
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div>
                <h3 className="font-bold text-lg">{voucher.name}</h3>
                <span className="badge-warning bg-accent-orange/10 text-accent-orange border border-accent-orange/30 mt-1">
                  Token-2022
                </span>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-accent-orange">{voucher.discount}%</p>
                <p className="text-[10px] text-surface-400 uppercase tracking-widest">Discount</p>
              </div>
            </div>

            <div className="space-y-3 relative z-10">
              <div className="bg-surface-900/50 rounded-lg p-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-surface-400">Claimed Supply</span>
                  <span className="font-semibold">{voucher.claimed} / {voucher.supply}</span>
                </div>
                <div className="w-full bg-surface-700 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent-orange" 
                    style={{ width: `${(voucher.claimed / voucher.supply) * 100}%` }}
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <button className="btn-secondary flex-1 py-2 text-xs flex items-center justify-center gap-1">
                  <Settings size={14} /> Manage
                </button>
                <button className="bg-surface-800 hover:bg-surface-700 text-surface-300 py-2 px-3 rounded-xl transition-colors flex items-center justify-center">
                  <ExternalLink size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {/* Placeholder for new voucher */}
        <div className="glass-card p-6 border-dashed border-2 border-surface-700 flex flex-col items-center justify-center text-center hover:bg-surface-800/50 transition-colors cursor-pointer min-h-[220px]">
          <div className="w-12 h-12 rounded-full bg-surface-800 flex items-center justify-center text-surface-400 mb-3">
            <Plus size={24} />
          </div>
          <p className="font-medium text-surface-300">Issue New Voucher</p>
          <p className="text-xs text-surface-500 mt-1 max-w-[200px]">Create a new Token-2022 drops to incentivize your audience.</p>
        </div>
      </div>
    </div>
  );
}
