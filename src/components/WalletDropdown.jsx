import { useState, useRef, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { ChevronDown, ChevronUp, User, LayoutDashboard, Gift, CreditCard, Settings, HelpCircle, LogOut, Copy, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function WalletDropdown() {
  const { publicKey, disconnect, connected } = useWallet();
  const { profile, updateProfile, resetOnboarding } = useApp();
  const { logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [priceInSol, setPriceInSol] = useState(false);

    const [copied, setCopied] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const address = publicKey?.toBase58() || '';
  const shortAddress = `${address.slice(0, 5)}...${address.slice(-5)}`;

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDisconnect = async () => {
    // ─── Professional Logout Sequence ───
    setIsOpen(false);
    try {
        if (connected) {
            await disconnect().catch(() => null);
        }
        await logout().catch(() => null);
    } catch (e) {
        console.warn('Logout cleanup incomplete:', e);
    } finally {
        resetOnboarding();  // Clear Local Cache
        navigate('/');      // Return to Landing
    }
  };

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const navTo = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-surface-700 bg-surface-900/60 hover:bg-surface-800 transition-colors"
      >
        <div className="w-5 h-5 rounded-full bg-surface-800 overflow-hidden flex items-center justify-center border border-surface-700">
          {profile.avatarUrl ? (
            <img 
              src={profile.avatarUrl} 
              alt="" 
              className="w-full h-full object-cover" 
              onError={(e) => { e.target.style.display = 'none'; }} 
            />
          ) : (
            <User size={12} className="text-surface-500" />
          )}
        </div>
        <span className="text-sm font-medium text-white font-mono tracking-tight">{shortAddress || 'Not Connected'}</span>
        {isOpen ? <ChevronUp size={14} className="text-surface-400" /> : <ChevronDown size={14} className="text-surface-400" />}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-[#141a23] border border-surface-700/80 rounded-xl shadow-2xl py-2 z-50 animate-fade-in">
          
          <div className="px-4 py-2">
            <p className="text-xs font-semibold text-surface-500 mb-2 font-black uppercase tracking-widest text-center">Creator Portal</p>
            <div className="space-y-1">
              
              <div className="bg-white/5 border border-white/5 flex flex-col items-start p-3 rounded-xl">
                <p className="font-bold text-sm truncate mb-1 text-white">{profile.solDomain || profile.displayName || 'Creator'}</p>
                <div className="flex items-center gap-1.5 w-full justify-between">
                  <span className="text-[10px] font-mono text-surface-500 uppercase">{shortAddress}</span>
                  <div className="flex gap-1.5">
                    <button onClick={copyAddress} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-surface-400 hover:text-white transition-colors" title="Copy Address">
                      {copied ? <Check size={12} className="text-brand-500" /> : <Copy size={12} />}
                    </button>
                    <a
                      href={`https://solscan.io/account/${address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-surface-400 hover:text-white transition-colors"
                      title="View on Solscan"
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>
           
           
              <button onClick={() => navTo(`/${profile.solDomain || profile.displayName || 'creator'}`)} className="w-full flex items-center justify-between text-sm text-surface-200 hover:text-white hover:bg-surface-800/80 p-2 rounded-lg transition-colors group">
                <div className="flex items-center gap-3">
                  <User size={16} className="text-surface-500 group-hover:text-brand-500 transition-colors" />
                  <span className="font-medium">My Tip Page</span>
                </div>
              </button>
              
              <button onClick={() => navTo('/dashboard')} className="w-full flex items-center justify-between text-sm text-surface-200 hover:text-white hover:bg-surface-800/80 p-2 rounded-lg transition-colors group">
                <div className="flex items-center gap-3">
                  <LayoutDashboard size={16} className="text-surface-500 group-hover:text-brand-500 transition-colors" />
                  <span className="font-medium">My Dashboard</span>
                </div>
              </button>

              <button onClick={() => navTo('/dashboard/tips')} className="w-full flex items-center justify-between text-sm text-surface-200 hover:text-white hover:bg-surface-800/80 p-2 rounded-lg transition-colors group">
                <div className="flex items-center gap-3">
                  <Gift size={16} className="text-surface-500 group-hover:text-brand-500 transition-colors" />
                  <span className="font-medium">Tips Received</span>
                </div>
                <span className="text-brand-500 font-bold text-xs">0</span>
              </button>
            </div>
          </div>

          <div className="h-px bg-white/5 my-1 mx-4" />

          <div className="px-4 py-2">
            <p className="text-xs font-semibold text-surface-500 mb-2 font-black uppercase tracking-widest text-center">Settings</p>
            <div className="space-y-1">
            
              <div className="w-full flex items-center justify-between text-sm text-surface-200 p-2 rounded-lg mb-1">
                <div className="flex items-center gap-3">
                  <CreditCard size={16} className="text-surface-500" />
                  <span className="font-medium text-xs">Auto-Settle USDC</span>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    updateProfile({ auto_convert_usdc: profile.auto_convert_usdc === false ? true : false });
                  }}
                  className={`w-8 h-4 rounded-full transition-colors relative ${profile.auto_convert_usdc !== false ? 'bg-brand-500' : 'bg-surface-700'}`}
                >
                  <div className={`w-3 h-3 bg-[#0a0a0a] rounded-full absolute top-0.5 transition-transform ${profile.auto_convert_usdc !== false ? 'translate-x-4.5 left-0' : 'translate-x-0.5 left-0'}`} />
                </button>
              </div>

              <button onClick={() => navTo('/dashboard/settings')} className="w-full flex items-center gap-3 text-sm text-surface-200 hover:text-white hover:bg-surface-800/80 p-2 rounded-lg transition-colors group">
                <Settings size={16} className="text-surface-500 group-hover:text-brand-500 transition-colors" />
                <span className="font-medium">Profile Settings</span>
              </button>
              
              <button onClick={() => {}} className="w-full flex items-center gap-3 text-sm text-surface-200 hover:text-white hover:bg-surface-800/80 p-2 rounded-lg transition-colors group">
                <HelpCircle size={16} className="text-surface-500 group-hover:text-brand-500 transition-colors" />
                <span className="font-medium">Help & Support</span>
              </button>

              <button 
                onClick={handleDisconnect} 
                className="w-full flex items-center gap-3 text-sm text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-colors mt-1 font-bold"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
