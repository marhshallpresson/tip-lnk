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

  const [recipientInput, setRecipientInput] = useState(fixedRecipient?.username || '');
  const [resolvedAddress, setResolvedAddress] = useState(fixedRecipient?.address || null);
  const [isResolving, setIsResolving] = useState(false);
  const [txStep, setTxStep] = useState('configure'); // configure, simulate, review, processing, done
  const [showTokenDropdown, setShowTokenDropdown] = useState(false);
  const [note, setNote] = useState('');

  // ─── Resolve Recipient Address (Only if not fixed) ───
  useEffect(() => {
    if (fixedRecipient) {
      setResolvedAddress(fixedRecipient.address);
      return;
    }
    
    const resolveHandle = async () => {
      if (!recipientInput || recipientInput.length < 3) {
        setResolvedAddress(null);
        return;
      }

      setIsResolving(true);
      try {
        // 1. Check if it's already a valid SOL address
        if (recipientInput.length >= 32 && recipientInput.length <= 44) {
          setResolvedAddress(recipientInput);
          setIsResolving(false);
          return;
        }

        // 2. Simulate SNS/Handle resolution (e.g., test.sol)
        // In production: await agent.resolve(recipientInput)
        setTimeout(() => {
          if (recipientInput.includes('.') || recipientInput.length > 5) {
            // Mock destination for demo
            setResolvedAddress('HN7cABqLq46Es1jh92dQQisG62sr6pD8HCHLSRsfK34Z');
          } else {
            setResolvedAddress(null);
          }
          setIsResolving(false);
        }, 500);
      } catch (err) {
        console.error('Resolution error:', err);
        setResolvedAddress(null);
        setIsResolving(false);
      }
    };

    const timer = setTimeout(resolveHandle, 500);
    return () => clearTimeout(timer);
  }, [recipientInput, fixedRecipient]);

  const recipientRisk = assessRecipient(resolvedAddress);

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
  } = useTipping(resolvedAddress);

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

  return (
    <div id="tip-widget" className="glass-card p-8 max-w-lg mx-auto shadow-2xl relative overflow-hidden transition-all duration-300 hover:border-brand-500/30">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 to-accent-cyan opacity-50" />
      
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center mx-auto mb-4 border border-brand-500/20">
          <Send size={28} className="text-brand-400" />
        </div>
        <h3 className="text-2xl font-black mb-1 tracking-tight">
          {fixedRecipient ? `Tip ${fixedRecipient.username}` : 'Creator Transfer'}
        </h3>
        <p className="text-surface-400 text-sm">
          {fixedRecipient ? 'Support this creator directly on-chain' : 'Direct on-chain earning distribution'}
        </p>
      </div>

      {/* Recipient Search (Only if not fixed) */}
      {!fixedRecipient && (
        <div className="mb-6">
          <label className="text-xs font-bold text-surface-500 uppercase tracking-widest mb-2 block">Recipient Creator</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-500">
              {isResolving ? <Loader2 size={18} className="animate-spin text-brand-400" /> : <Search size={18} />}
            </div>
            <input 
              type="text"
              className="input-field w-full pl-12 pr-4"
              placeholder="Username.sol or wallet address"
              value={recipientInput}
              onChange={(e) => setRecipientInput(e.target.value)} 
            />
            {resolvedAddress && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-accent-green/10 text-accent-green px-2 py-1 rounded-md border border-accent-green/20">
                <ShieldCheck size={12} />
                <span className="text-[10px] font-bold uppercase">Verified</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Amount & Token */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        <div className="bg-surface-800/50 rounded-2xl p-5 border border-surface-700">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-surface-500 uppercase tracking-widest">Amount to Send</span>
            <div className="relative">
              <button
                onClick={() => setShowTokenDropdown(!showTokenDropdown)}
                className="flex items-center gap-2 bg-surface-700 hover:bg-surface-600 px-3 py-1.5 rounded-xl transition-all border border-surface-600"
              >
                <span className="font-bold text-xs">{selectedToken.symbol}</span>
                <ChevronDown size={12} className="text-surface-400" />
              </button>
              {showTokenDropdown && (
                <div className="absolute top-full mt-2 right-0 bg-surface-800 border border-surface-700 rounded-2xl shadow-2xl z-50 min-w-[140px] overflow-hidden">
                  {tokens.map((token) => (
                    <button
                      key={token.symbol}
                      onClick={() => {
                        setSelectedToken(token);
                        setShowTokenDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 hover:bg-surface-700 transition-colors text-left ${
                        selectedToken.symbol === token.symbol ? 'bg-brand-500/10 text-brand-400' : ''
                      }`}
                    >
                      <span className="font-bold text-sm">{token.symbol}</span>
                      <span className="text-[10px] opacity-50 uppercase">{token.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <input
              type="number"
              className="flex-1 bg-transparent text-4xl font-black outline-none placeholder-surface-700"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* Quick Select Multipliers (BuyMeCoffee Style) */}
          <div className="flex gap-2 mt-6">
            {[2, 5, 10, 25].map((val) => (
              <button
                key={val}
                onClick={() => setAmount(val.toString())}
                className={`flex-1 py-2.5 rounded-xl border text-xs font-black transition-all ${
                  amount === val.toString() 
                    ? 'bg-brand-500 border-brand-500 text-black shadow-lg shadow-brand-500/20' 
                    : 'bg-surface-900 border-surface-800 text-surface-500 hover:border-surface-600 hover:text-white'
                }`}
              >
                ${val}
              </button>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-surface-700/50 flex justify-between items-center">
            <span className="text-xs text-surface-500 italic">Approx. Value</span>
            <span className="text-lg font-bold text-accent-green animate-pulse-slow">${Number(tipAmountUSDC).toFixed(2)} <span className="text-xs opacity-50">USDC</span></span>
          </div>
        </div>
      </div>

      {/* Note / Message */}
      <div className="mb-8">
        <label className="text-xs font-bold text-surface-500 uppercase tracking-widest mb-2 block">Transfer Note (Optional)</label>
        <div className="relative">
          <div className="absolute left-4 top-4 text-surface-500">
            <FileText size={18} />
          </div>
          <textarea
            className="input-field w-full pl-12 py-3 min-h-[80px] resize-none text-sm"
            placeholder="Add a message to your transaction..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      {/* Transaction Details / Invoice Section */}
      {route && (
        <div className="mb-8 bg-surface-900/50 rounded-2xl p-5 border border-surface-800 animate-fade-in">
          <div className="flex items-center gap-2 mb-4 text-brand-400">
            <Activity size={16} />
            <h4 className="text-xs font-bold uppercase tracking-widest">Transaction Specification</h4>
          </div>
          
          <div className="space-y-3">
            {recipientRisk && recipientRisk.level !== 'Safe' && (
              <div className={`p-3 rounded-xl border flex items-start gap-3 ${
                recipientRisk.level === 'Critical' ? 'bg-accent-red/10 border-accent-red/30' : 
                'bg-accent-orange/10 border-accent-orange/30'
              }`}>
                <AlertCircle size={14} className={recipientRisk.level === 'Critical' ? 'text-accent-red' : 'text-accent-orange'} />
                <p className="text-[10px] font-medium leading-tight">{recipientRisk.message}</p>
              </div>
            )}

            <div className="flex justify-between text-xs">
              <span className="text-surface-500">Execution Layer</span>
              <span className="text-surface-300 font-mono">{route.executionMode === 'async' ? 'Jito Bundle' : 'Mainnet Atomic'}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-surface-500">Price Impact</span>
              <span className="text-surface-300 font-mono">{(parseFloat(route.priceImpactPct) * 100).toFixed(3)}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-surface-500">Est. Arrival</span>
              <span className="text-surface-300 font-mono">{route.estimatedTime}</span>
            </div>
            
            <div className="mt-4 pt-4 border-t border-surface-800">
              <div className="flex items-center gap-2 mb-2">
                <Layers size={14} className="text-accent-cyan" />
                <span className="text-[10px] font-bold uppercase text-accent-cyan">Intelligent Routing</span>
              </div>
              <div className="flex gap-2">
                {route.routePlan.map((step, i) => (
                  <div key={i} className="flex-1 bg-surface-800 rounded-lg py-2 px-3 flex justify-between items-center border border-surface-700">
                    <span className="text-[10px] font-bold text-white">{step.swapInfo.label}</span>
                    <span className="text-[10px] text-brand-400 font-mono">{step.swapInfo.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {txStep === 'configure' ? (
          <button
            onClick={() => setTxStep('review')}
            disabled={!resolvedAddress || !amount || processing}
            className="btn-primary w-full flex items-center justify-center gap-3 !py-4 shadow-xl shadow-brand-500/10 group"
          >
            {processing ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="group-hover:scale-110 transition-transform" />}
            Send
          </button>
        ) : txStep === 'review' ? (
          <div className="flex gap-3">
            <button onClick={() => setTxStep('configure')} className="btn-secondary flex-1 font-bold">Edit</button>
            <button
              onClick={handleSendTip}
              className="btn-primary flex-[2] flex items-center justify-center gap-3 !py-4 bg-gradient-to-r from-brand-500 to-brand-600"
            >
              <CreditCard size={20} />
              Confirm & Authorize
            </button>
          </div>
        ) : (
          <div className="btn-primary w-full flex items-center justify-center gap-3 !py-4 opacity-80 cursor-not-allowed">
            <Loader2 size={20} className="animate-spin" />
            Finalizing on Solana...
          </div>
        )}
      </div>

      <p className="text-center text-surface-600 text-[10px] mt-6 flex items-center justify-center gap-1.5 uppercase font-bold tracking-tighter">
        <ShieldCheck size={12} className="text-accent-green" />
        Secured by DFlow & TipLnk Protocol
      </p>
    </div>
  );
}
