import { useState, useRef, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useApp } from '../contexts/AppContext';
import { ChevronDown, ChevronUp, User, LayoutDashboard, Gift, CreditCard, Settings, HelpCircle, LogOut, Copy, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function WalletDropdown() {
  const { publicKey, disconnect } = useWallet();
  const { profile, resetOnboarding } = useApp();
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

  const handleDisconnect = () => {
    disconnect();
    resetOnboarding();
    setIsOpen(false);
  };
    const copyAddress = () => {
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
          {profile.avatarUrl || (profile.nftAvatar?.image && !profile.nftAvatar.image.includes('placeholder')) ? (
            <img 
              src={profile.avatarUrl || profile.nftAvatar.image} 
              alt="" 
              className="w-full h-full object-cover" 
              onError={(e) => { e.target.style.display = 'none'; }} 
            />
          ) : (
            <User size={12} className="text-surface-500" />
          )}
        </div>
        <span className="text-sm font-medium text-white font-mono tracking-tight">{shortAddress}</span>
        {isOpen ? <ChevronUp size={14} className="text-surface-400" /> : <ChevronDown size={14} className="text-surface-400" />}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-[#141a23] border border-surface-700/80 rounded-xl shadow-2xl py-2 z-50 animate-fade-in">
          
          <div className="px-4 py-2">
            <p className="text-xs font-semibold text-surface-500 mb-2">Creator Portal</p>
            <div className="space-y-1">
              
              <div className="btn-secondary flex flex-col items-start p-3">
                <p className="font-bold text-sm truncate mb-1">{profile.solDomain || profile.displayName || 'Creator'}</p>
                <div className="flex items-center gap-1.5 w-full justify-between">
                  <span className="text-[10px] font-mono text-surface-500 uppercase">{shortAddress}</span>
                  <div className="flex gap-1.5">
                    <button onClick={copyAddress} className="p-1 rounded-md bg-surface-800 hover:bg-surface-700 text-surface-400 hover:text-white transition-colors" title="Copy Address">
                      {copied ? <Check size={10} className="text-brand-500" /> : <Copy size={10} />}
                    </button>
                    <a
                      href={`https://solscan.io/account/${address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded-md bg-surface-800 hover:bg-surface-700 text-surface-400 hover:text-white transition-colors"
                      title="View on Solscan"
                    >
                      <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
              </div>
           
           
              <button onClick={() => navTo(`/${profile.solDomain || 'creator'}`)} className="w-full flex items-center justify-between text-sm text-surface-200 hover:text-white hover:bg-surface-800/80 p-2 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <User size={16} className="text-surface-400" />
                  <span>My Tip Page</span>
                </div>
              </button>
              
              <button onClick={() => navTo('/dashboard')} className="w-full flex items-center justify-between text-sm text-surface-200 hover:text-white hover:bg-surface-800/80 p-2 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <LayoutDashboard size={16} className="text-surface-400" />
                  <span>My Dashboard</span>
                </div>
              </button>

              <button onClick={() => navTo('/dashboard/tips')} className="w-full flex items-center justify-between text-sm text-surface-200 hover:text-white hover:bg-surface-800/80 p-2 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <Gift size={16} className="text-surface-400" />
                  <span>Tips Received</span>
                </div>
                <span className="text-accent-green font-medium text-xs">(0)</span>
              </button>

              <button onClick={() => navTo('/dashboard/payouts')} className="w-full flex items-center justify-between text-sm text-surface-200 hover:text-white hover:bg-surface-800/80 p-2 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <CreditCard size={16} className="text-surface-400" />
                  <span>Payouts</span>
                </div>
                <span className="text-accent-green font-medium text-xs">(0)</span>
              </button>
            </div>
          </div>

          <div className="h-px bg-surface-800/60 my-1 mx-4" />

          <div className="px-4 py-2">
            <p className="text-xs font-semibold text-surface-500 mb-2">Settings</p>
            <div className="space-y-1">
            
              <button onClick={() => navTo('/dashboard/settings')} className="w-full flex items-center gap-3 text-sm text-surface-200 hover:text-white hover:bg-surface-800/80 p-2 rounded-lg transition-colors">
                <Settings size={16} className="text-surface-400" />
                <span>Profile Settings</span>
              </button>
              
              <button onClick={() => {}} className="w-full flex items-center gap-3 text-sm text-surface-200 hover:text-white hover:bg-surface-800/80 p-2 rounded-lg transition-colors">
                <HelpCircle size={16} className="text-surface-400" />
                <span>Help & Support</span>
              </button>

              <button onClick={handleDisconnect} className="w-full flex items-center gap-3 text-sm text-accent-red hover:bg-accent-red/10 p-2 rounded-lg transition-colors mt-1">
                <LogOut size={16} />
                <span>Disconnect</span>
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
