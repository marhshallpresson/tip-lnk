import { useState } from 'react';
import { CreditCard, Landmark, ArrowRight, ArrowDownLeft, Clock, CheckCircle } from 'lucide-react';

export default function PayoutPanel() {
  const [fiatAmount, setFiatAmount] = useState('');
  const [ngnAmount, setNgnAmount] = useState('');
  
  // Real-time payout history (to be fetched from backend in Phase 2)
  const payoutHistory = [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  
        {/* Pajcash NGN Off-ramp */}
        <div className="glass-card p-6 border-accent-orange/20">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2 text-accent-orange">
                <Landmark size={18} /> Pajcash Off-ramp
              </h3>
              <p className="text-surface-400 text-sm mt-1">Withdraw USDC directly to Nigerian Bank</p>
            </div>
            <span className="badge-warning bg-accent-orange/10 text-accent-orange border border-accent-orange/30 text-[10px]">Instant</span>
          </div>

          <div className="space-y-4">
            <div className="bg-surface-800/50 p-4 rounded-xl border border-surface-700 focus-within:border-accent-orange/50 transition-colors">
              <label className="text-xs font-medium text-surface-400 mb-2 block">Amount to Withdraw (USDC)</label>
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-surface-300">$</span>
                <input 
                  type="number" 
                  value={ngnAmount}
                  onChange={(e) => setNgnAmount(e.target.value)}
                  className="bg-transparent border-none outline-none text-2xl font-bold w-full"
                  placeholder="50.00"
                />
              </div>
            </div>
            
            <div className="flex justify-between text-sm px-2">
              <span className="text-surface-500">Exchange Rate:</span>
              <span className="font-mono text-surface-300">1 USDC = ~1,250 NGN</span>
            </div>
            <div className="flex justify-between text-sm px-2">
              <span className="text-surface-500">You will receive approx:</span>
              <span className="font-semibold text-accent-orange">₦ {ngnAmount ? (ngnAmount * 1250).toLocaleString() : '0'}</span>
            </div>

            <button className="btn-primary w-full flex items-center justify-center gap-2 bg-gradient-to-r from-accent-orange/80 to-accent-orange hover:from-accent-orange hover:to-[#ffb347]">
              Withdraw to Bank via Pajcash <ArrowRight size={16} />
            </button>
          </div>
        </div>

      </div>

      {/* Payout History */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock size={18} className="text-brand-400" /> Payout History
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-surface-800 text-surface-500">
                <th className="pb-3 font-medium px-4">Date</th>
                <th className="pb-3 font-medium px-4">Amount (USDC)</th>
                <th className="pb-3 font-medium px-4">Received (NGN)</th>
                <th className="pb-3 font-medium px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/50">
              {payoutHistory.map((payout) => (
                <tr key={payout.id} className="hover:bg-surface-800/20 transition-colors">
                  <td className="py-4 px-4 text-surface-300">
                    {new Date(payout.date).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-4 font-semibold text-white">
                    {payout.amountUSDC.toFixed(2)} USDC
                  </td>
                  <td className="py-4 px-4 font-mono text-accent-orange">
                    ₦ {payout.amountNGN.toLocaleString()}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent-green/10 text-accent-green border border-accent-green/20">
                      <CheckCircle size={12} />
                      <span className="text-xs font-semibold uppercase tracking-wider">{payout.status}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
