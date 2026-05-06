import { useEffect, useMemo, useState, useCallback } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { useTipping } from '../hooks/useTipping';
import { getPhantomDeepLink, getSolanaPayUri, hasSolanaProvider, isMobile } from '../utils/deepLinks';
import { 
  ShieldCheck, 
  Zap, 
  Lock, 
  Loader2, 
  CreditCard, 
  Wallet,
  CheckCircle2,
  ChevronDown,
  ArrowRight
} from 'lucide-react';

const PRESET_AMOUNTS = [1, 5, 10, 25, 50];

export default function TipWidget({ fixedRecipient = null, onSuccess, theme = 'dark', accent = '#00D265' }) {
  const { publicKey } = useWallet();
  const { profile: viewerProfile, addTip } = useApp();
  const { setShowWalletModal } = useAuth();

  const [recipientInput, setRecipientInput] = useState(fixedRecipient?.username || '');
  const [resolvedAddress, setResolvedAddress] = useState(fixedRecipient?.address || null);
  const [isResolving, setIsResolving] = useState(false);
  const [amount, setAmount] = useState('5');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' or 'crypto'
  const [showTokenMenu, setShowTokenMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [fiatQuote, setFiatQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [widgetError, setWidgetError] = useState('');

  const {
    tokens,
    tokensLoading,
    selectedToken,
    setSelectedToken,
    calculateRoute,
    route,
    processing,
    executeTip,
    txResult,
    setTxResult,
    reset,
    error: tippingError
  } = useTipping(resolvedAddress);

  // Sync recipient for public widget
  useEffect(() => {
    if (fixedRecipient) {
      setResolvedAddress(fixedRecipient.address);
      setRecipientInput(fixedRecipient.username || '');
      return;
    }
    const resolveHandle = async () => {
      if (!recipientInput) { setResolvedAddress(null); return; }
      setIsResolving(true);
      try {
        const isProd = import.meta.env.PROD;
        const base = isProd ? window.location.origin : import.meta.env.VITE_API_BASE_URL;
        const handle = recipientInput.startsWith('@') ? recipientInput : `@${recipientInput}`;
        const res = await fetch(`${base}/api/deep-link/resolve?handle=${encodeURIComponent(handle)}`);
        if (res.ok) {
          const data = await res.json();
          setResolvedAddress(data?.id || null);
        }
      } catch { setResolvedAddress(null); } finally { setIsResolving(false); }
    };
    const timeout = setTimeout(resolveHandle, 200);
    return () => clearTimeout(timeout);
  }, [recipientInput, fixedRecipient]);

  // Sync route calculation for crypto
  useEffect(() => {
    if (paymentMethod !== 'crypto') return;
    const parsed = Number(amount);
    if (!resolvedAddress || !selectedToken?.symbol || !Number.isFinite(parsed) || parsed <= 0) return;
    calculateRoute(selectedToken.symbol, parsed, note);
  }, [paymentMethod, amount, selectedToken, resolvedAddress, note, calculateRoute]);

  // Sync fiat quote for card
  useEffect(() => {
    const fetchRate = async () => {
      const parsed = Number(amount);
      if (paymentMethod !== 'card' || !Number.isFinite(parsed) || parsed <= 0) {
        setFiatQuote(null);
        return;
      }
      setQuoteLoading(true);
      try {
        const isProd = import.meta.env.PROD;
        const base = isProd ? window.location.origin : import.meta.env.VITE_API_BASE_URL;
        const res = await fetch(`${base}/api/payments/fiat/rate?amount=${parsed}`);
        const data = await res.json();
        if (res.ok && data?.success) setFiatQuote(data);
        else setFiatQuote(null);
      } catch { setFiatQuote(null); } finally { setQuoteLoading(false); }
    };
    const timeout = setTimeout(fetchRate, 500);
    return () => clearTimeout(timeout);
  }, [amount, paymentMethod]);

  const handlePay = async () => {
    setWidgetError('');
    if (!resolvedAddress || !amount || Number(amount) <= 0) {
      setWidgetError('Please enter a valid amount and ensure recipient is resolved.');
      return;
    }

    if (paymentMethod === 'crypto') {
        if (!publicKey) {
            setShowWalletModal(true);
            return;
        }
        try {
            // Enhanced Crypto Flow: Handle mobile deep linking and desktop execution
            if (isMobile() && !hasSolanaProvider()) {
                const uri = getSolanaPayUri(resolvedAddress, amount, selectedToken?.mint || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
                window.location.href = uri;
                setTimeout(() => { 
                    const deepLink = getPhantomDeepLink(window.location.href);
                    if (deepLink) window.location.href = deepLink;
                }, 1000);
                return;
            }
            
            const result = await executeTip(viewerProfile?.displayName || 'Anonymous', note);
            if (result?.success) {
                addTip({
                    recipientId: resolvedAddress,
                    recipient: recipientInput,
                    inputToken: selectedToken?.symbol || 'SOL',
                    inputAmount: amount,
                    amountUSDC: result.outAmount,
                    note,
                    txSignature: result.signature,
                    timestamp: new Date()
                }, true);
                onSuccess?.(result);
            }
        } catch (err) { 
            console.error('Crypto execution fault:', err);
            setWidgetError(err?.message || 'Crypto payment failed. Please try again.'); 
        }
    } else {
        // Enhanced Fiat Flow: Intent creation + monitoring
        try {
            const isProd = import.meta.env.PROD;
            const base = isProd ? window.location.origin : import.meta.env.VITE_API_BASE_URL;
            const response = await fetch(`${base}/api/payments/fiat/intent`, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'X-Requested-With': 'TipStackWidget'
                },
                body: JSON.stringify({
                    creatorId: resolvedAddress,
                    amount: Number(amount),
                    senderName: viewerProfile?.displayName || 'Anonymous',
                    memo: note
                })
            });

            const data = await response.json();
            if (!response.ok || !data?.checkoutUrl) {
                throw new Error(data?.error || 'Failed to initialize card payment session.');
            }

            const checkoutPopup = window.open(data.checkoutUrl, 'tipstack_pay', 'width=520,height=760,status=no,location=no');
            
            // Local state to show processing while popup is open
            setTxResult({ status: 'pending', signature: data.intentId, outAmount: Number(amount) });
            
            // Poll for status
            const pollStatus = setInterval(async () => {
                if (checkoutPopup && checkoutPopup.closed) {
                    clearInterval(pollStatus);
                }
                try {
                    const sRes = await fetch(`${base}/api/payments/fiat/status?intentId=${data.intentId}`);
                    const sData = await sRes.json();
                    if (sData?.success && sData.status === 'completed') {
                        clearInterval(pollStatus);
                        setTxResult({ status: 'confirmed', signature: data.intentId, outAmount: Number(amount) });
                        addTip({
                            recipientId: resolvedAddress,
                            recipient: recipientInput,
                            inputToken: 'FIAT_USD',
                            inputAmount: amount,
                            amountUSDC: Number(amount),
                            note,
                            txSignature: data.intentId,
                            timestamp: new Date()
                        }, true);
                        onSuccess?.({ success: true, method: 'fiat' });
                    }
                } catch (e) { /* ignore poll errors */ }
            }, 3000);

        } catch (err) { 
            console.error('Fiat execution fault:', err);
            setWidgetError(err?.message || 'Card payment initialization failed.'); 
        }
    }
  };

  const filteredTokens = useMemo(() => {
    if (!searchTerm) return tokens;
    const term = searchTerm.toLowerCase();
    return tokens.filter((t) => t.symbol.toLowerCase().includes(term) || (t.name || '').toLowerCase().includes(term));
  }, [tokens, searchTerm]);

  const isPresetActive = (val) => Number(amount) === val;

  if (txResult?.status === 'confirmed') {
      return (
          <div className="bg-[#121214] border border-white/5 rounded-[28px] p-8 text-center animate-scale-in max-w-[360px] mx-auto shadow-2xl">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                  <CheckCircle2 size={32} className="text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Sent Successfully!</h3>
              <p className="text-white/40 text-sm mb-6">Your support of ${Number(amount).toFixed(2)} was delivered instantly.</p>
              <button onClick={() => { reset(); setAmount('5'); setNote(''); }} className="btn-primary w-full">Send Another</button>
          </div>
      );
  }

  return (
    <div className="bg-[#0f0f11] border border-white/5 rounded-[32px] p-5 w-full max-w-[380px] mx-auto shadow-2xl relative overflow-hidden font-sans">
      
      {/* Header Info */}
      <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center border border-brand-500/20 overflow-hidden">
             {fixedRecipient?.avatarUrl ? (
                 <img src={fixedRecipient.avatarUrl} alt="" className="w-full h-full object-cover" />
             ) : (
                 <div className="w-full h-full flex items-center justify-center text-xl font-black text-brand-500 bg-brand-500/5">
                    {recipientInput[0]?.toUpperCase() || 'T'}
                 </div>
             )}
          </div>
          <div>
              <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-white text-base">@{recipientInput || 'creator'}</h3>
                  <ShieldCheck size={14} className="text-brand-500" fill="currentColor" stroke="none" />
              </div>
          </div>
      </div>

      <div className="h-px bg-white/5 mb-6" />

      {/* Amount Presets */}
      <div className="grid grid-cols-5 gap-2 mb-4">
          {PRESET_AMOUNTS.map(val => (
              <button
                key={val}
                onClick={() => setAmount(val.toString())}
                className={`h-12 rounded-xl font-bold text-sm transition-all border ${
                    isPresetActive(val) 
                    ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)] scale-[1.05]' 
                    : 'bg-white/5 text-white/40 border-transparent hover:bg-white/10 hover:text-white'
                }`}
              >
                  ${val}
              </button>
          ))}
      </div>

      {/* Custom Amount & Note Section */}
      <div className="space-y-4 mb-6">
          <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 font-bold">$</span>
              <input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full h-14 bg-white/5 border border-white/5 rounded-2xl pl-8 pr-4 text-white font-bold focus:border-brand-500/50 outline-none transition-all group-hover:bg-white/[0.07]"
                placeholder="Other amount"
              />
              {paymentMethod === 'card' && fiatQuote && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-brand-500 bg-brand-500/10 px-2 py-1 rounded-lg border border-brand-500/20">
                      ~₦{Number(fiatQuote.amountNgn).toLocaleString()}
                  </div>
              )}
          </div>

          <div className="relative group">
              <input 
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a private note..."
                className="w-full h-14 bg-white/5 border border-white/5 rounded-2xl px-4 text-sm text-white/70 placeholder:text-white/20 focus:border-brand-500/50 outline-none transition-all group-hover:bg-white/[0.07]"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-500/50 bg-emerald-500/5 px-2 py-1 rounded-lg border border-emerald-500/10">
                  <Lock size={10} /> Encrypted
              </div>
          </div>
      </div>

      {/* Payment Selection & Token Picker (Crypto Only) */}
      <div className="space-y-4 mb-6">
          <div className="flex bg-black/40 rounded-xl p-1 border border-white/5">
              <button 
                onClick={() => setPaymentMethod('card')}
                className={`flex-1 h-9 rounded-lg flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${paymentMethod === 'card' ? 'bg-white/10 text-white shadow-sm' : 'text-white/20 hover:text-white/40'}`}
              >
                  <CreditCard size={12} /> Card (NGN)
              </button>
              <button 
                onClick={() => setPaymentMethod('crypto')}
                className={`flex-1 h-9 rounded-lg flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${paymentMethod === 'crypto' ? 'bg-white/10 text-white shadow-sm' : 'text-white/20 hover:text-white/40'}`}
              >
                  <Wallet size={12} /> Crypto (SOL)
              </button>
          </div>

          {paymentMethod === 'crypto' && (
              <div className="relative">
                  <button
                    onClick={() => setShowTokenMenu(!showTokenMenu)}
                    className="w-full h-11 rounded-xl border border-white/5 bg-white/5 px-4 flex items-center justify-between text-xs font-bold text-white/60 hover:bg-white/[0.07] transition-all"
                  >
                    <span className="flex items-center gap-2">
                        {selectedToken?.symbol || 'Select Asset'}
                        {selectedToken?.balance !== undefined && <span className="text-[10px] text-white/20 font-normal">Bal: {selectedToken.balance.toFixed(2)}</span>}
                    </span>
                    <ChevronDown size={14} className={`transition-transform ${showTokenMenu ? 'rotate-180' : ''}`} />
                  </button>
                  {showTokenMenu && (
                    <div className="absolute top-full left-0 w-full mt-2 rounded-xl border border-white/10 bg-[#161618] p-2 z-50 shadow-2xl max-h-48 overflow-y-auto">
                        <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search..." className="w-full bg-white/5 border-none rounded-lg px-3 py-2 text-xs text-white mb-2 outline-none" />
                        {tokensLoading ? <Loader2 size={16} className="animate-spin mx-auto my-4 text-white/20" /> : filteredTokens.slice(0, 50).map(t => (
                            <button key={t.mint} onClick={() => { setSelectedToken(t); setShowTokenMenu(false); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 flex items-center justify-between group">
                                <span className="text-xs font-bold text-white/70 group-hover:text-white">{t.symbol}</span>
                                <span className="text-[10px] text-white/20">{t.balance?.toFixed(2)}</span>
                            </button>
                        ))}
                    </div>
                  )}
              </div>
          )}
      </div>

      {/* Main Action Button */}
      <button 
        onClick={handlePay}
        disabled={processing || quoteLoading || !amount || Number(amount) <= 0 || !resolvedAddress}
        className="w-full h-16 rounded-[22px] bg-gradient-to-r from-[#FFB800] to-[#FF9500] text-black font-black text-lg shadow-[0_8px_30px_rgba(255,184,0,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none"
      >
          {processing || quoteLoading ? (
              <Loader2 size={24} className="animate-spin" />
          ) : (
              <>Send ${Number(amount || 0).toFixed(2)} <ArrowRight size={20} /></>
          )}
      </button>

      {(widgetError || tippingError) && (
          <div className="text-center text-red-500 text-[10px] mt-4 font-bold bg-red-500/5 p-2 rounded-lg border border-red-500/10">
            {widgetError || tippingError}
          </div>
      )}

      {/* Footer Credentials */}
      <div className="flex items-center justify-center gap-6 mt-6">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/20">
              <ShieldCheck size={12} className="text-emerald-500/50" /> Private
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/20">
              <Zap size={12} className="text-brand-500/50" /> Instant
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/20">
              <CheckCircle2 size={12} className="text-brand-500/50" /> 0% fees
          </div>
      </div>
    </div>
  );
}
