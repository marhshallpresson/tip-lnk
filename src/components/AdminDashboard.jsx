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
  Database,
  Lock,
  Mail,
  LogOut
} from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [email, setEmail] = useState();
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [creators, setCreators] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const isProd = import.meta.env.PROD;
      const API_BASE = isProd ? window.location.origin : (import.meta.env.VITE_API_BASE_URL);
      
      // The dashboard stats still require the backend secret for data aggregation
      const adminSecret = 'tiplnk-elite-admin-2026-god-mode'; 
      const headers = { 'x-admin-secret': adminSecret };
      
      const [statsRes, creatorsRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/stats`, { headers }),
        fetch(`${API_BASE}/api/admin/creators`, { headers })
      ]);

      if (!statsRes.ok || !creatorsRes.ok) {
        throw new Error('Unauthorized administrative access.');
      }

      const statsData = await statsRes.json();
      const creatorsData = await creatorsRes.json();

      setStats(statsData.stats);
      setCreators(creatorsData.creators);
    } catch (err) {
      console.error('Admin Data Fetch Fault:', err);
      setError('Session expired or unauthorized.');
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
        const isProd = import.meta.env.PROD;
        const API_BASE = isProd ? window.location.origin : (import.meta.env.VITE_API_BASE_URL);
        
        const response = await fetch(`${API_BASE}/api/auth/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (data.success) {
            setIsAuthenticated(true);
            localStorage.setItem('tiplnk_admin_session', 'active');
            fetchAdminData();
        } else {
            throw new Error(data.error || 'Invalid admin credentials');
        }
    } catch (err) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    const session = localStorage.getItem('tiplnk_admin_session');
    if (session === 'active') {
      setIsAuthenticated(true);
      fetchAdminData();
    }
  }, []);

  const handleLogout = () => {
      localStorage.removeItem('tiplnk_admin_session');
      setIsAuthenticated(false);
      setPassword('');
  };

  const filteredCreators = creators.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.walletAddress?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a0a]">
        <div className="glass-card p-8 max-w-md w-full animate-scale-in">
          <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={24} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-center mb-2">Admin Access</h2>
          <p className="text-white/40 text-sm text-center mb-10">Sign in to manage the TipLnk protocol.</p>
          
          {error && (
            <div className="bg-red-500/5 border border-red-500/10 text-red-500 p-4 rounded-lg mb-8 text-xs flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 ml-1">Email</label>
                <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                    <input 
                    type="email" 
                    placeholder="" 
                    className="input-field w-full !pl-12"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    />
                </div>
            </div>
            <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 ml-1">Password</label>
                <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                    <input 
                    type="password" 
                    placeholder="••••••••" 
                    className="input-field w-full !pl-12"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    />
                </div>
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary w-full bg-red-500 hover:bg-red-400 text-white border-none shadow-none mt-6"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Sign In'}
            </button>
          </form>
          <button onClick={() => navigate('/')} className="w-full text-white/20 hover:text-white text-[10px] font-semibold mt-8 uppercase tracking-wider transition-colors">
            Return to App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12 animate-fade-in">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Database className="text-white/20" /> Protocol Overview
          </h1>
          <p className="text-white/40 text-sm">Monitor treasury, volume, and creator activity.</p>
        </div>
        <button 
          onClick={handleLogout} 
          className="btn-secondary !px-4 !py-2 text-xs"
        >
          <LogOut size={14} /> Log Out
        </button>
      </div>

      {/* ─── KPI Grid ─── */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="stat-card">
            <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wider mb-4 flex items-center gap-2"><TrendingUp size={14} className="text-brand-500"/> Volume (TVL)</p>
            <p className="text-3xl font-bold tracking-tight">${stats.totalVolumeUSDC.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="stat-card">
            <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wider mb-4 flex items-center gap-2"><DollarSign size={14} className="text-emerald-500"/> Treasury</p>
            <p className="text-3xl font-bold tracking-tight text-emerald-500">${stats.platformRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="text-[10px] text-white/20 mt-2 font-medium">Accumulated Fees</p>
          </div>
          <div className="stat-card">
            <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wider mb-4 flex items-center gap-2"><Users size={14} className="text-purple-500"/> Creators</p>
            <p className="text-3xl font-bold tracking-tight">{stats.totalCreators.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wider mb-4 flex items-center gap-2"><Activity size={14} className="text-sky-500"/> Transactions</p>
            <p className="text-3xl font-bold tracking-tight">{stats.totalTips.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* ─── Creator CRM ─── */}
      <div className="glass-card">
        <div className="p-6 flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-white/5">
          <h3 className="text-lg font-bold">Creator Directory</h3>
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
            <input 
              type="text" 
              placeholder="Search by name, email, or wallet..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field w-full !pl-12 text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-white/20 text-[10px] uppercase tracking-wider border-b border-white/5">
                <th className="p-6 font-semibold">Creator</th>
                <th className="p-6 font-semibold">Wallet Address</th>
                <th className="p-6 font-semibold">Connected Platforms</th>
                <th className="p-6 font-semibold text-right">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredCreators.length > 0 ? filteredCreators.map((creator) => (
                <tr key={creator.id} className="hover:bg-white/[0.01] transition-colors group">
                  <td className="p-6">
                    <div className="flex flex-col">
                      <span className="font-semibold text-white">{creator.name || 'Anonymous'}</span>
                      <span className="text-xs text-white/40">{creator.email}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <code className="text-[10px] font-mono text-brand-500 bg-brand-500/5 px-2 py-1 rounded">
                      {creator.walletAddress ? `${creator.walletAddress.slice(0,8)}...${creator.walletAddress.slice(-8)}` : 'No Address'}
                    </code>
                  </td>
                  <td className="p-6">
                    <div className="flex flex-wrap gap-2">
                      {creator.twitterHandle && <span className="badge">𝕏 @{creator.twitterHandle}</span>}
                      {creator.discordHandle && <span className="badge">Discord</span>}
                      {!creator.twitterHandle && !creator.discordHandle && <span className="text-[10px] text-white/20 font-medium italic">None</span>}
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <span className="text-xs text-white/40">
                      {new Date(creator.created_at).toLocaleDateString()}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" className="p-12 text-center text-white/20 text-sm italic">No records found matching your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
