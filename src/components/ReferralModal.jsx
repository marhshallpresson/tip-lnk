import { useState } from 'react';
import { Gift, Copy, X, Check, Users } from 'lucide-react';

export default function ReferralModal({ isOpen, onClose, referralCode = 'REF-6G90UK' }) {
  const [activeTab, setActiveTab] = useState('referrals');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const referralLink = `https://tiplnk.com?ref=${referralCode}`;

  const copyToClipboard = (text, setCopied) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-[#0d1117] border border-surface-800 rounded-[32px] overflow-hidden shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="p-8 flex items-start justify-between">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center shrink-0">
              <Gift size={24} className="text-brand-500" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Referral Program</h2>
              <p className="text-surface-400 text-sm mt-1 font-medium">Earn commissions by inviting others</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-surface-800 rounded-full text-surface-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="px-8 pb-8">
          <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-surface-500 uppercase tracking-widest">Your Referral Code</span>
              <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center">
                 <span className="text-[10px] font-black text-white">X</span>
              </div>
            </div>
            
            <div className="flex gap-2 mb-4">
              <div className="flex-1 bg-black/40 border border-surface-800 rounded-xl px-4 py-3 font-mono font-bold text-white flex items-center">
                {referralCode}
              </div>
              <button 
                onClick={() => copyToClipboard(referralCode, setCopiedCode)}
                className="btn-secondary !px-4 !py-3 flex items-center gap-2 text-brand-400 border-brand-500/20"
              >
                {copiedCode ? <Check size={16} /> : <Copy size={16} />}
                <span className="text-sm">Copy</span>
              </button>
            </div>

            <div className="flex gap-2">
              <div className="flex-1 bg-black/40 border border-surface-800 rounded-xl px-4 py-3 font-mono text-xs text-surface-500 flex items-center truncate">
                {referralLink}
              </div>
              <button 
                onClick={() => copyToClipboard(referralLink, setCopiedLink)}
                className="bg-surface-800 hover:bg-surface-700 text-white text-xs font-bold px-4 py-3 rounded-xl transition-colors"
              >
                {copiedLink ? 'Copied' : 'Copy Link'}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-surface-800 mb-8">
            <button 
              onClick={() => setActiveTab('referrals')}
              className={`pb-4 px-2 text-sm font-bold transition-all relative ${
                activeTab === 'referrals' ? 'text-white' : 'text-surface-500 hover:text-surface-300'
              }`}
            >
              Referrals
              {activeTab === 'referrals' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500" />
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-surface-900 flex items-center justify-center mb-6">
              <Users size={32} className="text-surface-700" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">No referrals yet</h3>
            <p className="text-sm text-surface-500 max-w-[240px]">Share your code to start earning commissions from tips.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
