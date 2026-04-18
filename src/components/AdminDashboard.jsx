import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, 
  Users, 
  DollarSign, 
  AlertCircle, 
  Loader2, 
  ShieldCheck,
  ArrowUpRight,
  TrendingUp,
  Search,
  Database
} from 'lucide-react';

export default function AdminDashboard() {
  const { connected } = useWallet();
  const navigate = useNavigate();
  const [adminSecret, setAdminSecret] = useState(localStorage.getItem('tiplnk_admin_secret') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [creators, setCreators] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAdminData = async (secret) => {
    setLoading(true);
    setError(null);
    try {
      const isProd = import.meta.env.PROD;
      const API_BASE = isProd ? window.location.origin : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005');
      
      const headers = { 'x-admin-secret': secret };
      
      const [statsRes, creatorsRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/stats`, { headers }),
        fetch(`${API_BASE}/api/admin/creators`, { headers })
      ]);

      if (!statsRes.ok || !creatorsRes.ok) {
        throw new Error('Invalid Admin Secret or unauthorized access.');
      }

      const statsData = await statsRes.json();
      const creatorsData = await creatorsRes.json();

      setStats(statsData.stats);
      setCreators(creatorsData.creators);
      setIsAuthenticated(true);
      localStorage.setItem('tiplnk_admin_secret', secret);
    } catch (err) {
      console.error('Admin Auth Error:', err);
      setError(err.message || 'Failed to authenticate.');
      setIsAuthenticated(false);
      localStorage.removeItem('tiplnk_admin_secret');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminSecret && !isAuthenticated) {
      fetchAdminData(adminSecret);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    fetchAdminData(adminSecret);
  };

  const filteredCreators = creators.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.walletAddress?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card glow-brand p-8 max-w-md w-full animate-scale-in">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={32} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-black text-center mb-2">Protocol Admin Access</h2>
          <p className="text-surface-400 text-sm text-center mb-8">Enter the master secret to access the God View.</p>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-6 text-sm flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              placeholder="Enter Admin Secret" 
              className="input-field w-full"
              value={adminSecret}
              onChange={(e) => setAdminSecret(e.target.value)}
              required
            />
            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 border-0"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Authenticate'}
            </button>
          </form>
          <button onClick={() => navigate('/')} className="w-full text-surface-500 hover:text-white text-xs font-bold mt-6 uppercase tracking-widest">
            Return to App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter flex items-center gap-3">
            <Database className="text-red-500" /> Protocol God-View
          </h1>
          <p className="text-surface-400 text-sm">Real-time treasury and creator oversight.</p>
        </div>
        <button 
          onClick={() => {
            localStorage.removeItem('tiplnk_admin_secret');
            setIsAuthenticated(false);
            setAdminSecret('');
          }} 
          className="px-4 py-2 bg-surface-800 hover:bg-surface-700 rounded-xl text-xs font-bold text-surface-300 transition-colors"
        >
          Lock Console
        </button>
      </div>

      {/* ─── KPI Grid ─── */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-6 border-t-2 border-t-brand-500 relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-5"><Activity size={100} /></div>
            <p className="text-surface-400 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-2"><TrendingUp size={14} className="text-brand-400"/> Total Tipped (TVL)</p>
            <p className="text-3xl font-black">${stats.totalVolumeUSDC.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="glass-card p-6 border-t-2 border-t-accent-green relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-5"><DollarSign size={100} /></div>
            <p className="text-surface-400 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-2"><DollarSign size={14} className="text-accent-green"/> Treasury Revenue</p>
            <p className="text-3xl font-black text-accent-green">${stats.platformRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="text-[10px] text-surface-500 mt-1">From 5% Platform Fees</p>
          </div>
          <div className="glass-card p-6 border-t-2 border-t-accent-purple relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-5"><Users size={100} /></div>
            <p className="text-surface-400 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-2"><Users size={14} className="text-accent-purple"/> Active Creators</p>
            <p className="text-3xl font-black">{stats.totalCreators.toLocaleString()}</p>
          </div>
          <div className="glass-card p-6 border-t-2 border-t-accent-cyan relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-5"><ArrowUpRight size={100} /></div>
            <p className="text-surface-400 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-2"><Activity size={14} className="text-accent-cyan"/> Total Transactions</p>
            <p className="text-3xl font-black">{stats.totalTips.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* ─── Creator CRM ─── */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-black italic uppercase tracking-tighter">Creator CRM</h3>
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
            <input 
              type="text" 
              placeholder="Search creators..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field w-full !pl-10 !py-2 text-sm bg-surface-900 border-surface-800"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-800/50 text-surface-400 text-[10px] uppercase tracking-widest">
              <tr>
                <th className="p-4 font-bold rounded-tl-xl">Creator</th>
                <th className="p-4 font-bold">Wallet</th>
                <th className="p-4 font-bold">Socials</th>
                <th className="p-4 font-bold">Registered</th>
                <th className="p-4 font-bold rounded-tr-xl text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {filteredCreators.length > 0 ? filteredCreators.map((creator) => (
                <tr key={creator.id} className="hover:bg-surface-800/20 transition-colors group">
                  <td className="p-4">
                    <p className="font-bold text-white">{creator.name || 'Anonymous'}</p>
                    <p className="text-xs text-surface-500">{creator.email}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-mono text-xs text-brand-400 bg-brand-500/10 px-2 py-1 rounded inline-block">
                      {creator.walletAddress ? `${creator.walletAddress.slice(0,6)}...${creator.walletAddress.slice(-4)}` : 'No Wallet'}
                    </p>
                  </td>
                  <td className="p-4 space-y-1">
                    {creator.twitterHandle && <p className="text-xs text-surface-300">𝕏 @{creator.twitterHandle}</p>}
                    {creator.discordHandle && <p className="text-xs text-surface-300">👾 {creator.discordHandle}</p>}
                    {!creator.twitterHandle && !creator.discordHandle && <span className="text-xs text-surface-600 italic">None</span>}
                  </td>
                  <td className="p-4 text-xs text-surface-400">
                    {new Date(creator.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <a 
                      href={`/@${creator.twitterHandle || creator.walletAddress}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-[10px] bg-surface-800 text-white px-3 py-1.5 rounded-lg hover:bg-surface-700 font-bold uppercase tracking-widest inline-block"
                    >
                      View Page
                    </a>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-surface-500">No creators found matching "{searchQuery}"</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
