import { useState, useRef, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useApp } from '../contexts/AppContext';
import { ChevronDown, ChevronUp, User, LayoutDashboard, Gift, CreditCard, RefreshCw, HelpCircle, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function WalletDropdown() {
  const { publicKey, disconnect } = useWallet();
  const { profile, resetOnboarding } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [priceInSol, setPriceInSol] = useState(false);
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
        <div className="w-5 h-5 rounded-full bg-gradient-to-r from-accent-cyan to-brand-500 overflow-hidden">
          {profile.nftAvatar?.image && !profile.nftAvatar.image.includes('placeholder') && (
            <img src={profile.nftAvatar.image} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
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
              <div className="w-full flex items-center justify-between text-sm text-surface-200 p-2 rounded-lg hover:bg-surface-800/80 transition-colors cursor-pointer" onClick={() => setPriceInSol(!priceInSol)}>
                <div className="flex items-center gap-3">
                  <span className="text-surface-400">§</span>
                  <span>Price in SOL</span>
                </div>
                <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${priceInSol ? 'bg-white' : 'bg-surface-700'}`}>
                  <div className={`w-3 h-3 rounded-full bg-surface-900 transition-transform ${priceInSol ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>

              <button onClick={() => {}} className="w-full flex items-center gap-3 text-sm text-surface-200 hover:text-white hover:bg-surface-800/80 p-2 rounded-lg transition-colors">
                <RefreshCw size={16} className="text-surface-400" />
                <span>Change Wallet</span>
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
