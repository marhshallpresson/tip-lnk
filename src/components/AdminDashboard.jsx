import AdminFiatPanel from './AdminFiatPanel';
import { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
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
  LogOut,
  Shield,
  ExternalLink,
  ArrowRightLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  ChevronRight,
  CreditCard
} from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminRole, setAdminRole] = useState(null); // superadmin, support, compliance
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [creators, setCreators] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState('overview'); // overview, crm, ledger, audit

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const isProd = import.meta.env.MODE === 'production';
      const API_BASE = isProd ? window.location.origin : (import.meta.env.VITE_API_BASE_URL || '');
      
      // ─── ELITE SECURITY: NO HARDCODED SECRETS ───
      // We rely on the server-side session (cookie) and pass the temporary key.
      const adminSecret = sessionStorage.getItem('tipstack_transient_admin_secret'); 
      const headers = { 
        'Content-Type': 'application/json',
        'x-admin-secret': adminSecret || '' 
      };
      
      const [statsRes, creatorsRes, ledgerRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/stats`, { headers }),
        fetch(`${API_BASE}/api/admin/creators`, { headers }),
        fetch(`${API_BASE}/api/admin/ledger`, { headers }).catch(() => ({ ok: false }))
      ]);

      if (!statsRes.ok) throw new Error('Unauthorized administrative access.');

      const statsData = await statsRes.json();
      const creatorsData = creatorsRes.ok ? await creatorsRes.json() : { creators: [] };
      const ledgerData = (ledgerRes && ledgerRes.ok) ? await ledgerRes.json() : { ledger: [] };

      setStats(statsData.stats);
      setAdminRole(statsData.role || 'compliance');
      setCreators(creatorsData.creators);
      setLedger(ledgerData.ledger);
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
        const isProd = import.meta.env.MODE === 'production';
        const API_BASE = isProd ? window.location.origin : (import.meta.env.VITE_API_BASE_URL || '');
        
        const response = await fetch(`${API_BASE}/api/auth/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (data.success) {
            // Store password as the temporary x-admin-secret for this session
            sessionStorage.setItem('tipstack_transient_admin_secret', password);
            setIsAuthenticated(true);
            localStorage.setItem('tipstack_admin_session', 'active');
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
    const session = localStorage.getItem('tipstack_admin_session');
    if (session === 'active') {
      setIsAuthenticated(true);
      fetchAdminData();
    }
  }, []);

  const handleLogout = () => {
      localStorage.removeItem('tipstack_admin_session');
      sessionStorage.removeItem('tipstack_transient_admin_secret');
      setIsAuthenticated(false);
      setAdminRole(null);
      setPassword('');
  };

  const filteredCreators = creators.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.walletAddress?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.twitterHandle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.discordHandle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.solDomain?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a0a]">
        <div className="glass-card p-8 max-w-md w-full animate-scale-in border-red-500/20 shadow-2xl shadow-red-500/5">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-red-500/20">
            <ShieldCheck size={32} className="text-red-500" />
          </div>
          <h2 className="text-3xl font-black text-center mb-2 tracking-tighter italic">ADMIN PORTAL</h2>
          <p className="text-white/40 text-sm text-center mb-10 font-medium">Professional Operations & Compliance Hub</p>
          
          {error && (
            <div className="bg-red-500/5 border border-red-500/10 text-red-500 p-4 rounded-xl mb-8 text-xs flex items-center gap-2 animate-shake">
              <AlertCircle size={16} className="shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2 text-left">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Identity (Email)</label>
                <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                    <input 
                    type="email" 
                    placeholder="admin@tipstack.fun" 
                    className="input-field w-full !pl-12 !h-14 bg-white/[0.02]"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    />
                </div>
            </div>
            <div className="space-y-2 text-left">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Access Token (Password)</label>
                <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                    <input 
                    type="password" 
                    placeholder="••••••••••••" 
                    className="input-field w-full !pl-12 !h-14 bg-white/[0.02]"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    />
                </div>
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full h-14 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest transition-all mt-8 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <>Enter God Mode <Shield size={18} /></>}
            </button>
          </form>
          <button onClick={() => navigate('/')} className="w-full text-white/20 hover:text-white text-[10px] font-black mt-8 uppercase tracking-[0.3em] transition-colors">
            Exit to Public Site
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12 animate-fade-in pb-32">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-red-600 flex items-center justify-center shrink-0 shadow-lg shadow-red-600/20">
             <Shield size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter flex items-center gap-3">
              OPERATIONS <span className="text-red-600 italic">HUB</span>
            </h1>
            <div className="flex items-center gap-3 mt-1">
               <div className="px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 text-[10px] font-black uppercase tracking-widest text-red-500">
                  {adminRole}
               </div>
               <p className="text-white/40 text-xs font-medium uppercase tracking-widest">Protocol Oversight Engaged</p>
            </div>
          </div>
        </div>

        <nav className="flex items-center gap-1 p-1 bg-white/5 rounded-2xl border border-white/5">
           {[
             { id: 'overview', label: 'Stats', icon: TrendingUp },
             { id: 'crm', label: 'Creators', icon: Users },
             { id: 'ledger', label: 'Ledger', icon: Database },
             { id: 'fiat', label: 'Fiat', icon: CreditCard },
             { id: 'audit', label: 'Audit', icon: Lock }
           ].map(tab => (
             <button
               key={tab.id}
               onClick={() => setView(tab.id)}
               className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === tab.id ? 'bg-red-600 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
             >
               <tab.icon size={14} /> {tab.label}
             </button>
           ))}
        </nav>

        <button 
          onClick={handleLogout} 
          className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 hover:text-red-500 transition-all"
        >
          De-authenticate
        </button>
      </div>

      {/* ─── KPI Grid (Overview Only) ─── */}
      {view === 'overview' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-card !p-8 border-white/5 hover:border-red-500/20 transition-all group">
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2 group-hover:text-red-500 transition-colors">
               <TrendingUp size={14} /> Total Volume (TVL)
            </p>
            <p className="text-4xl font-black tracking-tighter">${stats.totalVolumeUSDC.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="glass-card !p-8 border-white/5 hover:border-emerald-500/20 transition-all group">
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2 group-hover:text-emerald-500 transition-colors">
               <DollarSign size={14} /> Platform Revenue
            </p>
            <p className="text-4xl font-black tracking-tighter text-emerald-500">${stats.platformRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="text-[10px] text-white/20 mt-3 font-black uppercase tracking-widest">Accumulated 5% Fees</p>
          </div>
          <div className="glass-card !p-8 border-white/5 hover:border-purple-500/20 transition-all group">
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2 group-hover:text-purple-500 transition-colors">
               <Users size={14} /> Active Creators
            </p>
            <p className="text-4xl font-black tracking-tighter">{stats.totalCreators.toLocaleString()}</p>
          </div>
          <div className="glass-card !p-8 border-white/5 hover:border-sky-500/20 transition-all group">
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2 group-hover:text-sky-500 transition-colors">
               <Activity size={14} /> Tip Transactions
            </p>
            <p className="text-4xl font-black tracking-tighter">{stats.totalTips.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* ─── Creator CRM View ─── */}
      {view === 'crm' && (
         <div className="glass-card border-white/5 animate-slide-up">
            <div className="p-8 flex flex-col sm:flex-row items-center justify-between gap-8 border-b border-white/5">
            <h3 className="text-xl font-black tracking-tight italic">CREATOR DIRECTORY</h3>
            <div className="relative w-full sm:w-96">
                <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" />
                <input 
                type="text" 
                placeholder="Lookup by Identity, Wallet, or Social..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field w-full !pl-14 !h-14 bg-white/[0.02] border-white/10 text-sm font-bold"
                />
            </div>
            </div>

            <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                <tr className="text-white/20 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5 bg-white/[0.01]">
                    <th className="p-8">Entity Identity</th>
                    <th className="p-8">Wallet Resolution</th>
                    <th className="p-8">Verification Status</th>
                    <th className="p-8">Risk Metrics</th>
                    <th className="p-8 text-right">Registration</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                {filteredCreators.length > 0 ? filteredCreators.map((creator) => (
                    <tr key={creator.id} className="hover:bg-white/[0.01] transition-colors group">
                    <td className="p-8">
                        <div className="flex flex-col">
                        <span className="font-black text-white text-base tracking-tight italic uppercase">{creator.name || 'Anonymous Entity'}</span>
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest mt-0.5">{creator.email}</span>
                        </div>
                    </td>
                    <td className="p-8">
                        <code className="text-[10px] font-mono text-red-500 bg-red-500/5 px-3 py-1.5 rounded-lg border border-red-500/10">
                        {creator.walletAddress ? `${creator.walletAddress.slice(0,12)}...${creator.walletAddress.slice(-8)}` : 'CLOAKED_ADDRESS'}
                        </code>
                    </td>
                    <td className="p-8">
                        <div className="flex flex-wrap gap-2">
                        {creator.twitterHandle && <span className="px-2 py-1 rounded bg-sky-500/10 border border-sky-500/20 text-[9px] font-black text-sky-500 uppercase tracking-widest">𝕏 @{creator.twitterHandle}</span>}
                        {creator.discordHandle && <span className="px-2 py-1 rounded bg-purple-500/10 border border-purple-500/20 text-[9px] font-black text-purple-500 uppercase tracking-widest">Discord</span>}
                        {creator.solDomain && <span className="px-2 py-1 rounded bg-brand-500/10 border border-brand-500/20 text-[9px] font-black text-brand-500 uppercase tracking-widest italic">{creator.solDomain}</span>}
                        {!creator.twitterHandle && !creator.discordHandle && <span className="text-[10px] text-white/20 font-black uppercase tracking-widest italic">Unverified</span>}
                        </div>
                    </td>
                    <td className="p-8">
                        <div className="flex items-center gap-4">
                           <div className="flex flex-col">
                              <span className="text-white font-black italic">{creator.total_tips}</span>
                              <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Total Tips</span>
                           </div>
                           {creator.suspicious_tips > 0 && (
                              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-500">
                                 <AlertCircle size={14} />
                                 <span className="text-[10px] font-black uppercase tracking-widest">{creator.suspicious_tips} Flags</span>
                              </div>
                           )}
                        </div>
                    </td>
                    <td className="p-8 text-right">
                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">
                        {new Date(creator.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                    </td>
                    </tr>
                )) : (
                    <tr>
                    <td colSpan="5" className="p-20 text-center text-white/20 text-[10px] font-black uppercase tracking-[0.4em] italic">Zero Records Found</td>
                    </tr>
                )}
                </tbody>
            </table>
            </div>
         </div>
      )}

      {/* ─── Global Ledger View (Restricted to Compliance/Superadmin) ─── */}
      {view === 'ledger' && (
          <div className="glass-card border-white/5 animate-slide-up relative overflow-hidden">
             {adminRole === 'support' && (
                 <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xl flex flex-col items-center justify-center p-12 text-center">
                    <Lock size={48} className="text-red-500 mb-6" />
                    <h3 className="text-2xl font-black tracking-tighter mb-4 italic uppercase">COMPLIANCE RESTRICTED</h3>
                    <p className="text-white/40 text-sm max-w-sm font-medium">Financial ledger access is strictly restricted to Compliance and Superadmin roles for regulatory data privacy.</p>
                 </div>
             )}
             <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xl font-black tracking-tight italic uppercase">PROTOCOL LEDGER</h3>
                <div className="flex items-center gap-4">
                   <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40">
                      Top 100 Transactions
                   </div>
                </div>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead>
                      <tr className="text-white/20 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5 bg-white/[0.01]">
                         <th className="p-8">Signature</th>
                         <th className="p-8">Flow</th>
                         <th className="p-8">Amount (USDC)</th>
                         <th className="p-8">Status</th>
                         <th className="p-8 text-right">Time (UTC)</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                      {ledger.map((tx) => (
                         <tr key={tx.signature} className="hover:bg-white/[0.01] transition-colors group">
                            <td className="p-8">
                               <div className="flex items-center gap-3">
                                  <code className="text-[10px] font-mono text-white/40 group-hover:text-red-500 transition-colors cursor-help" title={tx.signature}>
                                     {tx.signature.slice(0, 16)}...
                                  </code>
                                  <ExternalLink size={12} className="text-white/10 group-hover:text-white transition-colors" />
                               </div>
                            </td>
                            <td className="p-8">
                               <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                                     <ArrowRightLeft size={14} className="text-white/20" />
                                  </div>
                                  <div className="flex flex-col">
                                     <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{tx.sender.slice(0,6)}...</span>
                                     <ArrowRight size={10} className="text-white/20 my-0.5" />
                                     <span className="text-[10px] font-black uppercase tracking-widest text-brand-500">{tx.recipient.slice(0,6)}...</span>
                                  </div>
                               </div>
                            </td>
                            <td className="p-8">
                               <div className="flex flex-col">
                                  <span className="text-base font-black italic text-emerald-500">${Number(tx.amount).toFixed(2)}</span>
                                  <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">{tx.tokenSymbol} VIA {tx.method.toUpperCase()}</span>
                               </div>
                            </td>
                            <td className="p-8">
                               <div className="flex items-center gap-3">
                                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest ${tx.status === 'confirmed' || tx.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                                     {tx.status === 'confirmed' || tx.status === 'completed' ? <CheckCircle size={10} /> : <Clock size={10} />}
                                     {tx.status}
                                  </div>
                                  {adminRole === 'superadmin' && tx.method === 'fiat' && (tx.status === 'pending' || tx.status === 'submitted') && (
                                      <button 
                                        onClick={() => handleForceSettle(tx.signature)}
                                        className="px-2 py-1 rounded bg-red-600/20 border border-red-600/30 text-[8px] font-black uppercase text-red-500 hover:bg-red-600 hover:text-white transition-all"
                                      >
                                        Force Settle
                                      </button>
                                  )}
                               </div>
                            </td>
                            <td className="p-8 text-right">
                               <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">
                                  {new Date(tx.timestamp).toISOString().replace('T', ' ').slice(0, 19)}
                               </span>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
      )}

      {/* ─── Fiat Payment Monitor ─── */}
      {view === 'fiat' && <AdminFiatPanel />}

      {/* ─── Audit Trail View (Restricted to Compliance/Superadmin) ─── */}
      {view === 'audit' && (
          <div className="p-20 text-center glass-card border-white/5">
             <Shield size={64} className="text-red-500/20 mx-auto mb-8" />
             <h3 className="text-2xl font-black tracking-tighter italic uppercase mb-4 text-white/60 text-[24px]">SYSTEM AUDIT TRAIL</h3>
             <p className="text-white/20 text-sm max-w-sm mx-auto font-medium">Full immutable audit history is currently being synchronized with the backend. Real-time logging is active and available via SQL export for this session.</p>
          </div>
      )}
    </div>
  );
}
