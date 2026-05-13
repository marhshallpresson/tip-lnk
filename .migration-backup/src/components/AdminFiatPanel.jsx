import { useState, useEffect } from 'react';
import { DollarSign, Clock, CheckCircle, AlertCircle, RefreshCw, Database } from 'lucide-react';

export default function AdminFiatPanel() {
  const [data, setData] = useState({ intents: [], events: [] });
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const adminSecret = sessionStorage.getItem('tipstack_transient_admin_secret');
      const res = await fetch('/api/admin/payments/fiat', {
        headers: { 'x-admin-secret': adminSecret || '' }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch fiat data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black tracking-tight italic uppercase">FIAT PAYMENTS & WEBHOOKS</h3>
        <button onClick={fetchData} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="glass-card border-white/5 overflow-hidden">
        <table className="w-full text-left text-[10px] uppercase tracking-widest font-black">
          <thead className="bg-white/[0.02] border-b border-white/5 text-white/20">
            <tr>
              <th className="p-6">Intent ID</th>
              <th className="p-6">Amount (USD)</th>
              <th className="p-6">Status</th>
              <th className="p-6">Creator ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.intents.map(i => (
              <tr key={i.intent_id} className="hover:bg-white/[0.01]">
                <td className="p-6 text-white/60">{i.intent_id}</td>
                <td className="p-6 text-emerald-500">${Number(i.amount_usd).toFixed(2)}</td>
                <td className="p-6">
                    <span className={`px-2 py-1 rounded-md border ${i.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'}`}>
                        {i.status}
                    </span>
                </td>
                <td className="p-6 text-white/40">{i.creator_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
