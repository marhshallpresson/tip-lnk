import { useState, useEffect, useMemo } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useApp } from '../contexts/AppContext';
import { useTipping } from '../hooks/useTipping';
import { useSecurityGuardian } from '../hooks/useSecurityGuardian';
import {
  Gift,
  ArrowDown,
  Loader2,
  Check,
  ChevronDown,
  Send,
  Info,
  RefreshCw,
  Eye,
  Activity,
  Layers,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Search,
  User,
  FileText,
  Zap,
  ArrowRight,
  CreditCard
} from 'lucide-react';

/**
 * Advanced Creator-to-Creator Tipping Widget
 * Features: Username search, transaction details/invoice, real-time routing.
 */
export default function TipWidget({ fixedRecipient = null }) {
  const { publicKey } = useWallet();
  const { addTip, profile } = useApp();
  const { connection } = useConnection();
  const { assessRecipient } = useSecurityGuardian();

  const [recipientInput, setRecipientInput] = useState(fixedRecipient?.username || profile.displayName || '');
  const [resolvedAddress, setResolvedAddress] = useState(fixedRecipient?.address || null);
  const [isResolving, setIsResolving] = useState(false);
  const [txStep, setTxStep] = useState('configure'); // configure, confirm, select-currency, processing, done
  const [showTokenDropdown, setShowTokenDropdown] = useState(false);
  const [note, setNote] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // ─── Resolve Recipient Address (Only if not fixed) ───
  useEffect(() => {
    if (fixedRecipient) {
      setResolvedAddress(fixedRecipient.address);
      return;
    }
    
    const resolveHandle = async () => {
      if (!recipientInput) {
        setResolvedAddress(null);
        return;
      }

      setIsResolving(true);
      try {
        // ─── Professional Handle & Address Resolution ───
        const isProd = import.meta.env.PROD;
        const API_BASE_URL = isProd ? window.location.origin : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005');
        
        // 1. Check if it's a social handle
        if (recipientInput.startsWith('@')) {
          const res = await fetch(`${API_BASE_URL}/api/deep-link/resolve/${recipientInput}`);
          if (res.ok) {
            const { walletAddress } = await res.json();
            setResolvedAddress(walletAddress);
            setIsResolving(false);
            return;
          }
        }

        // 2. Check if it's already a valid Solana address
        if (recipientInput.length >= 32 && recipientInput.length <= 44) {
          setResolvedAddress(recipientInput);
        } else {
          setResolvedAddress(null);
        }
      } catch (err) {
        console.error('Resolution error:', err);
        setResolvedAddress(null);
      } finally {
        setIsResolving(false);
      }
    };

    const timer = setTimeout(resolveHandle, 300);
    return () => clearTimeout(timer);
  }, [recipientInput, fixedRecipient]);

  const {
    tokens,
    selectedToken,
    setSelectedToken,
    amount,
    setAmount,
    tipAmountUSDC,
    calculateRoute,
    route,
    processing,
    executeTip,
    txResult,
    reset,
    error,
  } = useTipping(resolvedAddress);

  const filteredTokens = useMemo(() => {
    if (!searchTerm) return tokens;
    return tokens.filter(t => 
      t.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tokens, searchTerm]);

  useEffect(() => {
    if (amount && selectedToken && resolvedAddress) {
      calculateRoute(selectedToken.symbol, parseFloat(amount) || 0);
    }
  }, [amount, selectedToken, calculateRoute, resolvedAddress]);

  const handleSendTip = async () => {
    setTxStep('processing');
    const result = await executeTip(profile.displayName || 'Anonymous Creator');
    if (result?.success) {
      // Log as a SENT tip
      addTip({
        recipient: recipientInput,
        recipientAddress: resolvedAddress,
        inputToken: selectedToken.symbol,
        inputAmount: amount,
        amountUSDC: result.outAmount,
        note: note,
        txSignature: result.signature,
        timestamp: result.timestamp,
        executionMode: result.executionMode
      }, true); // isSent = true
      setTxStep('done');
    }
  };

  const handleReset = () => {
    reset();
    if (!fixedRecipient) {
      setRecipientInput('');
      setResolvedAddress(null);
    }
    setNote('');
    setTxStep('configure');
  };

  if (txResult?.success) {
    return (
      <div className="glass-card glow-brand p-8 max-w-lg mx-auto text-center animate-scale-in">
        <div className="w-16 h-16 rounded-full bg-accent-green/20 flex items-center justify-center mx-auto mb-4">
          <Check size={28} className="text-accent-green" />
        </div>
        <h3 className="text-2xl font-bold mb-2">Transaction Sent</h3>
        <p className="text-surface-400 mb-6">
          Successfully transferred {amount} {selectedToken.symbol} to {recipientInput}
        </p>
        
        <div className="bg-surface-800/50 rounded-xl p-5 mb-6 text-left border border-surface-700">
          <p className="text-xs text-surface-500 uppercase font-bold mb-3 tracking-widest">Transaction Invoice</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-surface-400">Status</span>
              <span className="text-accent-green font-bold uppercase text-xs">Confirmed</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-surface-400">Signature</span>
              <span className="font-mono text-xs">{txResult.signature.slice(0, 12)}...</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-surface-700/50 mt-2">
              <span className="text-surface-400">Total Value</span>
              <span className="font-bold">${Number(txResult.outAmount).toFixed(2)} USDC</span>
            </div>
          </div>
          <a
            href={`https://solscan.io/tx/${txResult.signature}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary w-full text-xs !py-2 flex items-center justify-center gap-2 mt-4"
          >
            View on Solscan <ExternalLink size={12} />
          </a>
        </div>

        <button onClick={handleReset} className="btn-primary flex items-center gap-2 mx-auto">
          <RefreshCw size={16} />
          New Transaction
        </button>
      </div>
    );
  }

  // ─── Step 3: Select Payment Currency View ───
  if (txStep === 'select-currency') {
    return (
      <div className="glass-card p-6 min-h-[500px] flex flex-col animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black">Select Payment Currency</h3>
          <button onClick={() => setTxStep('confirm')} className="p-2 hover:bg-surface-800 rounded-full transition-colors">
            <AlertCircle size={20} className="rotate-45" /> {/* Close icon substitute */}
          </button>
        </div>
        
        <p className="text-surface-500 text-sm mb-4 font-medium">Choose a cryptocurrency for your ${amount} payment</p>
        
        <div className="relative mb-6">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-500" />
          <input 
            type="text" 
            autoFocus
            className="input-field w-full pl-12 pr-4 !bg-surface-900 border-surface-800 focus:border-brand-500"
            placeholder="Search currencies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
          {!searchTerm && (
            <div>
              <h4 className="text-[10px] font-black text-surface-600 uppercase tracking-[0.2em] mb-3">Popular</h4>
              <div className="space-y-2">
                {tokens.slice(0, 4).map(token => (
                  <TokenListItem 
                    key={token.symbol} 
                    token={token} 
                    isSelected={selectedToken.symbol === token.symbol}
                    onClick={() => {
                        setSelectedToken(token);
                        setTxStep('confirm');
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-[10px] font-black text-surface-600 uppercase tracking-[0.2em] mb-3">
              {searchTerm ? 'Search Results' : `All Currencies (${tokens.length})`}
            </h4>
            <div className="space-y-2">
              {filteredTokens.map(token => (
                <TokenListItem 
                  key={token.symbol} 
                  token={token} 
                  isSelected={selectedToken.symbol === token.symbol}
                  onClick={() => {
                      setSelectedToken(token);
                      setTxStep('confirm');
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Step 2: Confirm Tip Amount View ───
  if (txStep === 'confirm') {
    return (
      <div className="glass-card p-8 animate-scale-in border-brand-500/20 shadow-2xl shadow-brand-500/5">
        <div className="flex items-center justify-between mb-8">
            <button onClick={() => setTxStep('configure')} className="text-surface-500 hover:text-white transition-colors flex items-center gap-2 font-bold text-xs uppercase tracking-widest">
                <ChevronDown size={16} className="rotate-90" /> Back
            </button>
            <h3 className="text-xl font-black">Confirm Tip</h3>
            <div className="w-10" /> {/* Spacer */}
        </div>

        <div className="bg-surface-900/40 border border-surface-800 rounded-[24px] p-6 mb-8">
           <div className="flex justify-between items-start mb-1">
             <h4 className="text-xl font-black">Confirm Tip Amount</h4>
             <span className="text-2xl font-black">${parseFloat(amount).toFixed(2)}</span>
           </div>
           <p className="text-surface-500 text-[10px] font-bold uppercase tracking-widest mb-6">One-time payment</p>

           <label className="text-[10px] font-black text-surface-600 uppercase tracking-widest mb-3 block">Pay with</label>
           <div className="grid grid-cols-2 gap-2 mb-6">
             <button disabled className="flex items-center justify-center gap-2 h-12 rounded-xl bg-surface-800/50 border border-surface-700/50 text-surface-600 text-xs font-bold cursor-not-allowed">
               <CreditCard size={14} /> Card- <span className="text-[9px] opacity-70">Coming soon</span>
             </button>
             <button className="flex items-center justify-center gap-2 h-12 rounded-xl bg-brand-500 text-black text-xs font-black shadow-lg shadow-brand-500/20">
               <Zap size={14} /> Crypto
             </button>
           </div>

           <button 
             onClick={() => setTxStep('select-currency')}
             className="w-full h-14 bg-surface-900 border border-surface-800 hover:border-surface-600 rounded-[18px] px-5 flex items-center justify-between transition-all group"
           >
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-400 font-black text-[10px] border border-brand-500/20">
                 {selectedToken.symbol[0]}
               </div>
               <div className="text-left">
                 <span className="text-sm font-black block leading-none">{selectedToken.symbol}</span>
                 <span className="text-[9px] font-bold text-brand-500 uppercase tracking-tighter">SOLANA</span>
               </div>
             </div>
             <ChevronDown size={14} className="text-surface-600 group-hover:text-surface-400 rotate-[-90deg]" />
           </button>
        </div>

        {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl mb-6 flex items-center gap-3 text-red-400">
                <AlertCircle size={18} />
                <p className="text-xs font-bold">{error}</p>
            </div>
        )}

        <div className="space-y-4">
             {route && (
                 <div className="px-2 space-y-2 mb-6">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-surface-600">
                        <span>Swap Route</span>
                        <span className="text-brand-400">Optimized via DFlow</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono text-surface-400 italic">
                        <span>Price Impact</span>
                        <span>-{(parseFloat(route.priceImpactPct) * 100).toFixed(4)}%</span>
                    </div>
                 </div>
             )}

            <button
                onClick={handleSendTip}
                disabled={processing || !route}
                className="btn-primary w-full !h-16 flex items-center justify-center gap-3 text-lg !bg-brand-500 hover:!bg-brand-400 !text-black shadow-2xl shadow-brand-500/20 animate-pulse-slow disabled:opacity-50 disabled:animate-none"
            >
                {processing ? <Loader2 size={24} className="animate-spin" /> : <CreditCard size={24} />}
                <span className="tracking-tighter font-black italic uppercase">Pay Now</span>
            </button>
            <p className="text-center text-[9px] font-bold text-surface-600 uppercase tracking-widest">
                No extra fees • Powered by TipLnk Protocol
            </p>
        </div>
      </div>
    );
  }

  // ─── Step 1: Default Configure View ───
  return (
    <div id="tip-widget" className="glass-card p-6 sm:p-10 max-w-lg mx-auto shadow-2xl relative overflow-hidden transition-all duration-300 hover:border-brand-500/30">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 to-accent-cyan opacity-50" />
      
      <div className="text-center mb-10">
        <h3 className="text-2xl font-black mb-1 flex items-center justify-center gap-3">
           <Zap size={24} className="text-brand-500 fill-brand-500" />
           {fixedRecipient ? `Tip ${fixedRecipient.username}` : 'Send Support'}
        </h3>
        <p className="text-surface-500 text-xs font-bold uppercase tracking-widest opacity-80">
          Support this creator directly on-chain
        </p>
      </div>

      {/* Recipient Search (Only if not fixed) */}
      {!fixedRecipient && (
        <div className="mb-6">
          <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest mb-3 block">Supporter Destination</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-500">
              {isResolving ? <Loader2 size={18} className="animate-spin text-brand-400" /> : <Search size={18} />}
            </div>
            <input 
              type="text"
              className="input-field w-full pl-12 pr-4 !bg-surface-900 border-surface-800"
              placeholder="Username.sol or wallet address"
              value={recipientInput}
              onChange={(e) => setRecipientInput(e.target.value)} 
            />
          </div>
        </div>
      )}

      {/* Amount & Multipliers */}
      <div className="bg-surface-900 border border-surface-800 rounded-[32px] p-6 sm:p-8 mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <span className="text-3xl sm:text-4xl font-black text-white">$</span>
            <input
              type="number"
              className="w-24 sm:w-32 bg-transparent text-4xl sm:text-5xl font-black outline-none placeholder-surface-800 caret-brand-500"
              placeholder="5"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2 mb-8">
            {[1, 3, 5, 10].map((val) => (
              <button
                key={val}
                onClick={() => setAmount(val.toString())}
                className={`flex-1 py-3.5 rounded-2xl border text-sm font-black transition-all ${
                  amount === val.toString() 
                    ? 'bg-brand-500 border-brand-500 text-black shadow-lg shadow-brand-500/20 scale-105' 
                    : 'bg-surface-950 border-surface-800 text-surface-500 hover:border-surface-600 hover:text-white'
                }`}
              >
                {val}
              </button>
            ))}
          </div>

          <textarea
            className="input-field w-full !bg-surface-950/50 border-surface-800/50 py-4 px-5 min-h-[100px] resize-none text-sm placeholder-surface-700"
            placeholder="Say something nice... (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
      </div>

      {/* Action Button */}
      <button
        onClick={() => setTxStep('confirm')}
        disabled={!resolvedAddress || !amount || parseFloat(amount) <= 0}
        className="btn-primary w-full flex items-center justify-center gap-3 !h-16 !bg-brand-500 hover:!bg-brand-400 !text-black shadow-xl shadow-brand-500/10 group animate-fade-in"
      >
        <span className="text-lg font-black uppercase tracking-tight">Support ${amount || '5'}</span>
        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
}

/**
 * Helper: Token List Item for Selection Modal
 */
function TokenListItem({ token, isSelected, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center justify-between p-4 rounded-[18px] border transition-all ${
                isSelected 
                ? 'bg-brand-500/5 border-brand-500 shadow-sm shadow-brand-500/10' 
                : 'bg-surface-900 border-surface-800 hover:border-surface-700 hover:bg-surface-800/80'
            }`}
        >
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs border ${
                    isSelected ? 'bg-brand-500 text-black border-brand-500' : 'bg-surface-800 text-surface-400 border-surface-700'
                }`}>
                    {token.symbol[0]}
                </div>
                <div className="text-left">
                    <span className="font-black text-sm block leading-none mb-1 text-white">{token.symbol}</span>
                    <span className="text-[10px] font-bold text-surface-500 uppercase tracking-tighter">{token.name}</span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {isSelected && <Check size={16} className="text-brand-500" />}
                <span className="bg-surface-800 text-surface-400 text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-widest border border-surface-700">
                    Solana
                </span>
            </div>
        </button>
    );
}
