import { useState, useEffect, useMemo } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useApp } from '../contexts/AppContext';
import { useTipping } from '../hooks/useTipping';
import { useSecurityGuardian } from '../hooks/useSecurityGuardian';
import { useTransactionSimulation } from '../hooks/useTransactionSimulation';
import { getPhantomDeepLink, getSolflareDeepLink, isMobile, hasSolanaProvider } from '../utils/deepLinks';
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
  CreditCard,
  ShieldAlert
} from 'lucide-react';

/**
 * Advanced Creator-to-Creator Tipping Widget
 * Features: Mobile Deep Linking, Transaction Simulation, Sender-Pays 5% Fee.
 */
export default function TipWidget({ fixedRecipient = null }) {
  const { publicKey } = useWallet();
  const { addTip, profile } = useApp();
  const { connection } = useConnection();
  const { assessRecipient } = useSecurityGuardian();
  const { simulate, simulating, simulation, error: simError } = useTransactionSimulation();

  const [recipientInput, setRecipientInput] = useState(fixedRecipient?.username || profile.displayName || '');
  const [resolvedAddress, setResolvedAddress] = useState(fixedRecipient?.address || null);
  const [isResolving, setIsResolving] = useState(false);
  const [txStep, setTxStep] = useState('configure'); // configure, confirm, select-currency, processing, done
  const [searchTerm, setSearchTerm] = useState('');
  const [note, setNote] = useState('');

  // ─── Resolve Recipient Address ───
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
        const isProd = import.meta.env.PROD;
        const API_BASE_URL = isProd ? window.location.origin : (import.meta.env.VITE_API_BASE_URL);

        if (recipientInput.startsWith('@')) {
          const res = await fetch(`${API_BASE_URL}/api/deep-link/resolve/${recipientInput}`);
          if (res.ok) {
            const { walletAddress } = await res.json();
            setResolvedAddress(walletAddress);
            setIsResolving(false);
            return;
          }
        }

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
    feeAmountUSDC,
    totalAuthorizedUSDC,
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

  // ─── Elite Simulation Trigger ───
  useEffect(() => {
    if (route?.transaction && txStep === 'confirm') {
      simulate(route.transaction);
    }
  }, [route?.transaction, txStep, simulate]);

  const handleSendTip = async () => {
    // ─── Professional MWA / Deep Link Trigger ───
    if (isMobile() && !hasSolanaProvider()) {
        setTxStep('processing');
        // Choose best link for the device
        const deepLink = getPhantomDeepLink(window.location.href);
        window.location.href = deepLink;
        return;
    }

    setTxStep('processing');
    const result = await executeTip(profile?.displayName || 'Anonymous');
    if (result?.success) {
      addTip({
        recipient: recipientInput,
        recipientAddress: resolvedAddress,
        inputToken: selectedToken.symbol,
        inputAmount: amount,
        amountUSDC: result.outAmount,
        feeAmount: result.feeAmount,
        totalAuthorized: result.totalCharged,
        note: note,
        txSignature: result.signature,
        timestamp: result.timestamp,
        executionMode: result.executionMode
      }, true);
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
      <div className="glass-card p-8 max-w-lg mx-auto text-center animate-scale-in">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
          <Check size={24} className="text-emerald-500" />
        </div>
        <h3 className="text-2xl font-bold mb-2">Payment Sent</h3>
        <p className="text-white/40 mb-8 text-sm">
          Successfully sent {amount} {selectedToken.symbol} to {recipientInput}
        </p>

        <div className="bg-white/[0.02] rounded-xl p-5 mb-8 text-left border border-white/5">
          <p className="text-[10px] text-white/40 uppercase font-semibold mb-4 tracking-wider">Transaction Details</p>
          <div className="space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-white/40">Status</span>
              <span className="text-emerald-500 font-semibold uppercase text-[10px]">Confirmed</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-white/40">Signature</span>
              <span className="font-mono text-white/60">{txResult.signature.slice(0, 16)}...</span>
            </div>
            <div className="flex justify-between text-sm pt-4 border-t border-white/5 mt-4">
              <span className="text-white font-medium">Total Paid</span>
              <span className="font-bold text-brand-500">${Number(txResult.outAmount).toFixed(2)}</span>
            </div>
          </div>
          <a
            href={`https://solscan.io/tx/${txResult.signature}${import.meta.env.VITE_SOLANA_NETWORK === 'devnet' ? '?cluster=devnet' : ''}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary w-full text-xs !py-2 flex items-center justify-center gap-2 mt-6"
          >
            View on Solscan <ExternalLink size={12} />
          </a>
        </div>

        <button onClick={handleReset} className="btn-primary w-full">
          <RefreshCw size={16} />
          Send another tip
        </button>
      </div>
    );
  }

  if (txStep === 'select-currency') {
    return (
      <div className="glass-card p-6 min-h-[500px] flex flex-col animate-scale-in">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-lg font-bold">Select Asset</h3>
          <button onClick={() => setTxStep('confirm')} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <AlertCircle size={20} className="rotate-45 text-white/40" />
          </button>
        </div>
        <div className="relative mb-6">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            autoFocus
            className="input-field w-full pl-12 pr-4"
            placeholder="Search assets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
          {!searchTerm && (
            <div>
              <h4 className="text-[10px] font-semibold text-white/20 uppercase tracking-wider mb-4">Popular</h4>
              <div className="space-y-1">
                {tokens.slice(0, 4).map(token => (
                  <TokenListItem
                    key={token.symbol}
                    token={token}
                    isSelected={selectedToken.symbol === token.symbol}
                    onClick={() => { setSelectedToken(token); setTxStep('confirm'); }}
                  />
                ))}
              </div>
            </div>
          )}
          <div>
            <h4 className="text-[10px] font-semibold text-white/20 uppercase tracking-wider mb-4">
              {searchTerm ? 'Search Results' : `All Assets (${tokens.length})`}
            </h4>
            <div className="space-y-1">
              {filteredTokens.map(token => (
                <TokenListItem
                  key={token.symbol}
                  token={token}
                  isSelected={selectedToken.symbol === token.symbol}
                  onClick={() => { setSelectedToken(token); setTxStep('confirm'); }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (txStep === 'confirm') {
    return (
      <div className="glass-card p-8 animate-scale-in max-w-lg mx-auto relative overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => setTxStep('configure')} className="text-white/40 hover:text-white transition-colors flex items-center gap-1.5 font-medium text-xs">
            <ChevronDown size={16} className="rotate-90" /> Back
          </button>
          <h3 className="text-lg font-bold">Confirm Tip</h3>
          <div className="w-10" />
        </div>

        {/* --- QR Handover (Desktop Only) --- */}
        {!isMobile() && (
          <div className="hidden md:flex flex-col items-center mb-8 p-6 bg-white/[0.03] rounded-2xl border border-white/5">
            <div className="bg-white p-2 rounded-xl mb-3 shadow-2xl shadow-brand-500/10">
              <QRCodeSVG 
                value={window.location.href} 
                size={140} 
                fgColor="#000000"
                imageSettings={{
                    src: "/favicon.svg",
                    height: 24,
                    width: 24,
                    excavate: true,
                }}
              />
            </div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest text-center">
              Scan with Phantom or Solflare
            </p>
          </div>
        )}

        {/* --- DFlow Execution Metrics --- */}
        {route && (
          <div className="mb-6 p-4 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3">
             <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-white/40">
                <div className="flex items-center gap-1.5">
                    <Zap size={12} className="text-brand-500" />
                    Optimal Route Found
                </div>
                <span className="text-brand-500">DFlow Protocol</span>
             </div>
             <div className="flex items-center justify-between text-xs">
                <span className="text-white/60">Execution Speed</span>
                <span className="text-white font-medium">{route.estimatedTime}</span>
             </div>
             <div className="flex items-center justify-between text-xs">
                <span className="text-white/60">MEV Protection</span>
                <span className="text-emerald-500 font-bold italic uppercase text-[9px]">Enabled</span>
             </div>
          </div>
        )}

        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6 mb-8">
          <div className="flex justify-between items-start mb-1">
            <h4 className="text-sm font-medium text-white/40">Amount</h4>
            <span className="text-2xl font-bold tracking-tight">${parseFloat(amount).toFixed(2)}</span>
          </div>
          <p className="text-[10px] font-semibold text-white/20 uppercase tracking-wider mb-8">Direct Transfer</p>

          <label className="text-[10px] font-semibold text-white/20 uppercase tracking-wider mb-3 block">Pay with</label>
          <button
            onClick={() => setTxStep('select-currency')}
            className="w-full h-14 bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-xl px-4 flex items-center justify-between transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500 font-bold text-[10px] border border-brand-500/10">
                {selectedToken.symbol[0]}
              </div>
              <div className="text-left">
                <span className="text-sm font-semibold block leading-none text-white">{selectedToken.symbol}</span>
                <span className="text-[9px] font-medium text-white/20 uppercase tracking-tight">Solana</span>
              </div>
            </div>
            <ChevronDown size={14} className="text-white/20 group-hover:text-white/40 transition-colors" />
          </button>
        </div>

        {simulating && (
          <div className="mb-6 p-4 bg-brand-500/5 border border-brand-500/10 rounded-lg flex items-center gap-3">
            <Loader2 size={16} className="animate-spin text-brand-500" />
            <span className="text-[10px] font-semibold text-brand-500 uppercase tracking-wider">Simulating...</span>
          </div>
        )}

        {simulation && !simError && (
          <div className="mb-6 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-lg animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider">Simulation Success</span>
            </div>
            <div className="flex justify-between text-[10px] font-medium text-white/40">
              <span>Expected Balance Change</span>
              <span className="text-white">-{parseFloat(totalAuthorizedUSDC).toFixed(2)} USDC</span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {route && (
            <div className="px-1 space-y-4 mb-8">
              <div className="pt-4 border-t border-white/5 space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Base Tip</span>
                  <span className="text-white font-medium">${parseFloat(tipAmountUSDC).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Platform Fee (5%)</span>
                  <span className="text-sky-500 font-medium">+${parseFloat(feeAmountUSDC).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg pt-4 border-t border-white/10 mt-2">
                  <span className="text-white font-bold">Total</span>
                  <span className="text-brand-500 font-bold tracking-tight">${parseFloat(totalAuthorizedUSDC).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {isMobile() && !hasSolanaProvider() ? (
            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.href = getPhantomDeepLink(window.location.href)}
                className="btn-primary w-full !h-12 bg-[#AB9FF2] hover:bg-[#9081E6] !text-white border-none shadow-none"
              >
                <img src="https://phantom.app/favicon.ico" alt="Phantom" className="w-5 h-5 rounded-full" />
                Open in Phantom
              </button>
              <button
                onClick={() => window.location.href = getSolflareDeepLink(window.location.href)}
                className="btn-primary w-full !h-12 bg-[#E78E3A] hover:bg-[#D67C28] !text-white border-none shadow-none"
              >
                <img src="https://solflare.com/favicon.ico" alt="Solflare" className="w-5 h-5 rounded-full" />
                Open in Solflare
              </button>
            </div>
          ) : (
            <button
              onClick={handleSendTip}
              disabled={processing || !route || simulating}
              className="btn-primary w-full !h-14 text-lg disabled:opacity-50"
            >
              {processing ? <Loader2 size={24} className="animate-spin" /> : <CreditCard size={20} />}
              Confirm & Pay
            </button>
          )}
          <p className="text-center text-[10px] font-semibold text-white/20 uppercase tracking-wider mt-6">
              0% direct transfer fees • Instant creator payout
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="tip-widget" className="glass-card p-6 sm:p-10 max-w-lg mx-auto relative transition-all duration-300">
      <div className="text-center mb-10">
        <h3 className="text-2xl font-bold mb-2 flex items-center justify-center gap-3">
          <Zap size={24} className="text-brand-500" />
          {fixedRecipient ? `Tip ${fixedRecipient.username}` : 'Send Tip'}
        </h3>
        <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wider">Direct on-chain support</p>
      </div>

      {!fixedRecipient && (
        <div className="mb-8">
          <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-3 block">Recipient</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
              {isResolving ? <Loader2 size={18} className="animate-spin text-brand-500" /> : <Search size={18} />}
            </div>
            <input
              type="text"
              className="input-field w-full pl-12 pr-4"
              placeholder="Username or address"
              value={recipientInput}
              onChange={(e) => setRecipientInput(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6 sm:p-8 mb-8">
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="text-3xl sm:text-4xl font-bold text-white/20">$</span>
          <input
            type="number"
            className="w-24 sm:w-32 bg-transparent text-4xl sm:text-5xl font-bold outline-none placeholder-white/5 caret-brand-500 text-center"
            placeholder="5"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="flex gap-2 mb-8">
          {[1, 5, 10, 20].map((val) => (
            <button
              key={val}
              onClick={() => setAmount(val.toString())}
              className={`flex-1 py-3 rounded-lg border text-sm font-semibold transition-all ${amount === val.toString()
                  ? 'bg-brand-500 border-brand-500 text-black'
                  : 'bg-white/5 border-white/5 text-white/40 hover:border-white/10 hover:text-white'
                }`}
            >
              {val}
            </button>
          ))}
        </div>
        <textarea
          className="input-field w-full !h-24 py-3 px-4 resize-none text-sm"
          placeholder="Include a message... (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <button
        onClick={() => setTxStep('confirm')}
        disabled={!resolvedAddress || !amount || parseFloat(amount) <= 0}
        className="btn-primary w-full !h-14 group"
      >
        <span className="text-lg font-bold">Support ${amount || '5'}</span>
        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
}

function TokenListItem({ token, isSelected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between p-3.5 rounded-lg border transition-all ${isSelected
          ? 'bg-brand-500/5 border-brand-500/50'
          : 'bg-[#161616] border-white/5 hover:border-white/10 hover:bg-[#1a1a1a]'
        }`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] border ${isSelected ? 'bg-brand-500 text-black border-brand-500' : 'bg-white/5 text-white/40 border-white/5'
          }`}>
          {token.symbol[0]}
        </div>
        <div className="text-left">
          <span className="font-semibold text-sm block leading-none text-white">{token.symbol}</span>
          <span className="text-[10px] font-medium text-white/20 uppercase tracking-tight">{token.name}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isSelected && <Check size={16} className="text-brand-500" />}
        <span className="badge">SOLANA</span>
      </div>
    </button>
  );
}
