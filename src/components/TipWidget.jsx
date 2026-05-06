import { useEffect, useMemo, useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { useTipping } from '../hooks/useTipping';
import { getPhantomDeepLink, getSolanaPayUri, hasSolanaProvider, isMobile } from '../utils/deepLinks';
import {
  ArrowRight,
  Check,
  ChevronDown,
  CreditCard,
  ExternalLink,
  Loader2,
  Repeat,
  Wallet
} from 'lucide-react';

export default function TipWidget({ fixedRecipient = null, onSuccess }) {
  const { publicKey } = useWallet();
  const { profile: viewerProfile, addTip } = useApp();
  const { setShowWalletModal } = useAuth();

  const [recipientInput, setRecipientInput] = useState(fixedRecipient?.username || '');
  const [resolvedAddress, setResolvedAddress] = useState(fixedRecipient?.address || null);
  const [isResolving, setIsResolving] = useState(false);
  const [note, setNote] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [showTokenMenu, setShowTokenMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [fiatQuote, setFiatQuote] = useState(null);
  const [widgetError, setWidgetError] = useState('');
  const [showOnboardingNudge, setShowOnboardingNudge] = useState(false);

  const {
    tokens,
    tokensLoading,
    selectedToken,
    setSelectedToken,
    amount,
    setAmount,
    tipAmountUSDC,
    feeAmountUSDC,
    totalAuthorizedUSDC,
    calculateRoute,
    calculateRecurringRoute,
    route,
    recurringRoute,
    processing,
    executeTip,
    executeSubscription,
    txResult,
    setTxResult,
    reset,
    error
  } = useTipping(resolvedAddress);

  useEffect(() => {
    if (!amount) setAmount('7');
  }, [amount, setAmount]);

  useEffect(() => {
    const hasCompletedTip = localStorage.getItem('tipstack_first_tip_complete') === '1';
    setShowOnboardingNudge(!hasCompletedTip);
  }, []);

  useEffect(() => {
    if (fixedRecipient) {
      setResolvedAddress(fixedRecipient.address);
      setRecipientInput(fixedRecipient.username || '');
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
        const base = isProd ? window.location.origin : import.meta.env.VITE_API_BASE_URL;
        const handle = recipientInput.startsWith('@') ? recipientInput : `@${recipientInput}`;
        const res = await fetch(`${base}/api/deep-link/resolve?handle=${encodeURIComponent(handle)}`);
        if (res.ok) {
          const data = await res.json();
          setResolvedAddress(data?.id || null);
        } else {
          setResolvedAddress(null);
        }
      } catch {
        setResolvedAddress(null);
      } finally {
        setIsResolving(false);
      }
    };

    const timeout = setTimeout(resolveHandle, 180);
    return () => clearTimeout(timeout);
  }, [recipientInput, fixedRecipient]);

  useEffect(() => {
    if (paymentMethod !== 'crypto') return;
    const parsed = Number(amount);
    if (!resolvedAddress || !selectedToken?.symbol || !Number.isFinite(parsed) || parsed <= 0) return;
    calculateRoute(selectedToken.symbol, parsed, note);
  }, [paymentMethod, amount, selectedToken, resolvedAddress, note, calculateRoute]);

  useEffect(() => {
    if (paymentMethod !== 'crypto' || !isRecurring) return;
    const parsed = Number(amount);
    if (!resolvedAddress || !selectedToken?.symbol || !Number.isFinite(parsed) || parsed <= 0) return;
    calculateRecurringRoute(selectedToken.symbol, parsed, 'monthly', 12);
  }, [paymentMethod, isRecurring, amount, selectedToken, resolvedAddress, calculateRecurringRoute]);

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
        if (res.ok && data?.success) {
          setFiatQuote(data);
        } else {
          setFiatQuote(null);
        }
      } catch {
        setFiatQuote(null);
      } finally {
        setQuoteLoading(false);
      }
    };

    fetchRate();
  }, [amount, paymentMethod]);

  const filteredTokens = useMemo(() => {
    if (!searchTerm) return tokens;
    const term = searchTerm.toLowerCase();
    return tokens.filter((token) =>
      token.symbol.toLowerCase().includes(term) ||
      (token.name || '').toLowerCase().includes(term)
    );
  }, [tokens, searchTerm]);

  const handleCryptoPay = async () => {
    setWidgetError('');

    if (!resolvedAddress || !amount || Number(amount) <= 0) {
      setWidgetError('Enter a valid amount and recipient.');
      return;
    }

    if (!publicKey) {
      setShowWalletModal(true);
      return;
    }

    try {
      if (isRecurring) {
        const recurring = await executeSubscription(viewerProfile?.displayName || 'Anonymous');
        if (recurring) {
          onSuccess?.({ success: true, recurring: true });
        }
        return;
      }

      if (isMobile() && !hasSolanaProvider()) {
        const uri = getSolanaPayUri(resolvedAddress, amount, selectedToken.mint);
        window.location.href = uri;
        setTimeout(() => {
          window.location.href = getPhantomDeepLink(window.location.href);
        }, 1200);
        return;
      }

      const result = await executeTip(viewerProfile?.displayName || 'Anonymous', note);
      if (result?.success) {
        addTip(
          {
            recipientId: resolvedAddress,
            recipient: recipientInput,
            inputToken: selectedToken.symbol,
            inputAmount: amount,
            amountUSDC: result.outAmount,
            note,
            txSignature: result.signature,
            timestamp: new Date()
          },
          true
        );
        localStorage.setItem('tipstack_first_tip_complete', '1');
        setShowOnboardingNudge(false);
        onSuccess?.(result);
      }
    } catch (err) {
      setWidgetError(err?.message || 'Crypto payment failed.');
    }
  };

  const handleFiatPay = async () => {
    setWidgetError('');
    if (!resolvedAddress || !amount || Number(amount) <= 0) {
      setWidgetError('Enter a valid amount and recipient.');
      return;
    }

    try {
      const isProd = import.meta.env.PROD;
      const base = isProd ? window.location.origin : import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${base}/api/payments/fiat/intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: resolvedAddress,
          amount: Number(amount),
          senderName: viewerProfile?.displayName || 'Anonymous',
          memo: note
        })
      });

      const data = await response.json();
      if (!response.ok || !data?.checkoutUrl) {
        throw new Error(data?.error || 'Failed to initialize card/bank payment.');
      }

      const popup = window.open(data.checkoutUrl, '_blank', 'width=520,height=760');
      setTxResult({
        status: 'pending',
        signature: data.intentId,
        outAmount: Number(amount),
        executionMode: 'fossa_pay'
      });
      startFiatStatusMonitor(data.intentId, popup);
    } catch (err) {
      setWidgetError(err?.message || 'Card/bank payment failed.');
    }
  };

  const startFiatStatusMonitor = (intentId, popupWindow) => {
    const isProd = import.meta.env.PROD;
    const base = isProd ? window.location.origin : import.meta.env.VITE_API_BASE_URL;
    let attempts = 0;
    const maxAttempts = 120;
    const pollEveryMs = 3000;

    const interval = setInterval(async () => {
      attempts += 1;
      try {
        const res = await fetch(`${base}/api/payments/fiat/status?intentId=${encodeURIComponent(intentId)}`);
        const data = await res.json();
        if (res.ok && data?.success) {
          if (data.status === 'completed') {
            clearInterval(interval);
            setTxResult((prev) => ({ ...prev, status: 'confirmed' }));
            addTip(
              {
                recipientId: resolvedAddress,
                recipient: recipientInput,
                inputToken: 'FIAT_USD',
                inputAmount: Number(amount),
                amountUSDC: Number(amount),
                note,
                txSignature: intentId,
                timestamp: new Date()
              },
              true
            );
            localStorage.setItem('tipstack_first_tip_complete', '1');
            setShowOnboardingNudge(false);
            onSuccess?.({ success: true, signature: intentId, method: 'fiat' });
            return;
          }
          if (data.status === 'failed') {
            clearInterval(interval);
            setWidgetError('Fiat payment failed. Please retry.');
            return;
          }
        }
      } catch {}

      const popupClosed = popupWindow && popupWindow.closed;
      if ((popupClosed && attempts > 6) || attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, pollEveryMs);
  };

  const handleReset = () => {
    reset();
    setWidgetError('');
    setNote('');
    setIsRecurring(false);
    setPaymentMethod('card');
    if (!fixedRecipient) {
      setRecipientInput('');
      setResolvedAddress(null);
    }
  };

  if (txResult) {
    const isPending = txResult.status === 'pending';
    return (
      <div className="glass-card p-6 max-w-lg mx-auto text-center">
        <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-4 ${isPending ? 'bg-brand-500/15' : 'bg-emerald-500/15'}`}>
          {isPending ? <Loader2 className="animate-spin text-brand-500" size={22} /> : <Check className="text-emerald-500" size={22} />}
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{isPending ? 'Payment Pending' : 'Payment Confirmed'}</h3>
        <p className="text-xs text-white/50 mb-6">
          {isPending ? 'Complete checkout to finalize payment.' : 'Your support was sent successfully.'}
        </p>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left mb-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-white/50">Amount</span>
            <span className="text-white font-semibold">${Number(txResult.outAmount || amount).toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/50">Reference</span>
            <span className="text-white/70 font-mono">{String(txResult.signature || '').slice(0, 16)}...</span>
          </div>
        </div>
        {!isPending && (
          <a
            href={`https://solscan.io/tx/${txResult.signature}${import.meta.env.VITE_SOLANA_NETWORK === 'devnet' ? '?cluster=devnet' : ''}`}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary w-full !py-2 text-xs flex items-center justify-center gap-2 mb-3"
          >
            View on Solscan <ExternalLink size={12} />
          </a>
        )}
        <button onClick={handleReset} className="btn-primary w-full !h-12">
          Send another tip
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 max-w-lg mx-auto">
      {!fixedRecipient && (
        <div className="mb-4">
          <label className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-2 block">Recipient</label>
          <input
            type="text"
            value={recipientInput}
            onChange={(event) => setRecipientInput(event.target.value)}
            placeholder="username or wallet"
            className="input-field w-full"
          />
          {isResolving && <p className="text-[10px] text-white/40 mt-2">Resolving recipient...</p>}
        </div>
      )}

      <div className="rounded-xl border border-white/10 p-5 bg-[#080816]">
        <p className="text-2xl font-bold text-white mb-1">${Number(amount || 0).toFixed(0)}</p>
        <p className="text-[11px] text-white/45 mb-4">Starter Plan • one-time payment</p>

        <label className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-2 block">Pay with</label>
        <div className="grid grid-cols-2 gap-2 rounded-xl p-1 bg-black/30 border border-white/10 mb-4">
          <button
            className={`h-10 rounded-lg text-sm font-semibold transition-all ${paymentMethod === 'card' ? 'bg-brand-600 text-white' : 'text-white/55 hover:text-white'}`}
            onClick={() => setPaymentMethod('card')}
          >
            <span className="inline-flex items-center gap-2 justify-center">
              <CreditCard size={14} /> Card
            </span>
          </button>
          <button
            className={`h-10 rounded-lg text-sm font-semibold transition-all ${paymentMethod === 'crypto' ? 'bg-brand-600 text-white' : 'text-white/55 hover:text-white'}`}
            onClick={() => setPaymentMethod('crypto')}
          >
            <span className="inline-flex items-center gap-2 justify-center">
              <Wallet size={14} /> Crypto
            </span>
          </button>
        </div>

        {paymentMethod === 'crypto' && (
          <div className="space-y-3">
            <button
              onClick={() => setShowTokenMenu((v) => !v)}
              className="w-full h-11 rounded-lg border border-white/10 bg-black/20 px-3 flex items-center justify-between text-sm"
            >
              <span className="text-white">{selectedToken?.symbol || 'Select currency'}</span>
              <ChevronDown size={14} className="text-white/40" />
            </button>
            {showTokenMenu && (
              <div className="rounded-lg border border-white/10 bg-black/40 p-2 max-h-52 overflow-y-auto">
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search token"
                  className="input-field w-full !h-9 mb-2 text-sm"
                />
                <div className="space-y-1">
                  {tokensLoading && <p className="text-[11px] text-white/45 px-2 py-1">Loading Jupiter tokens...</p>}
                  {!tokensLoading && filteredTokens.slice(0, 40).map((token) => (
                    <button
                      key={token.mint}
                      onClick={() => {
                        setSelectedToken(token);
                        setShowTokenMenu(false);
                      }}
                      className="w-full text-left px-2 py-2 rounded-md hover:bg-white/5 flex items-center justify-between"
                    >
                      <span className="text-sm text-white">{token.symbol}</span>
                      <span className="text-[10px] text-white/40">{token.balance ? token.balance.toFixed(2) : ''}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {paymentMethod === 'card' && (
          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
            {quoteLoading ? (
              <p className="text-[11px] text-white/45">Fetching USD/NGN rate...</p>
            ) : fiatQuote ? (
              <div className="space-y-1 text-xs">
                <p className="text-white/70">₦{Number(fiatQuote.rate).toLocaleString()} per USDC</p>
                <p className="text-brand-400 font-semibold">You pay ${Number(amount || 0).toFixed(2)} • ~₦{Number(fiatQuote.amountNgn).toLocaleString()}</p>
                {fiatQuote.isFallback && (
                  <p className="text-[10px] text-amber-400">Using fallback rate feed.</p>
                )}
                <p className="text-[10px] text-white/40">
                  Quote valid until {new Date(fiatQuote.expiresAt).toLocaleTimeString()}
                  {fiatQuote.stale ? ' (stale)' : ''}
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-white/45">Local exchange quote unavailable right now.</p>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 p-3 rounded-xl border border-white/10 bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat size={14} className="text-white/60" />
          <div>
            <p className="text-xs text-white font-semibold">Monthly support</p>
            <p className="text-[10px] text-white/40">Automate this tip every 30 days</p>
          </div>
        </div>
        <button
          onClick={() => setIsRecurring((v) => !v)}
          className={`w-11 h-6 rounded-full transition-colors relative ${isRecurring ? 'bg-brand-500' : 'bg-white/15'}`}
        >
          <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${isRecurring ? 'translate-x-5' : ''}`} />
        </button>
      </div>

      <div className="mt-4">
        <label className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-2 block">Message (optional)</label>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Add a note"
          className="input-field w-full !h-20 resize-none"
        />
      </div>

      {paymentMethod === 'crypto' && route && (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-1 text-xs">
          <div className="flex justify-between"><span className="text-white/50">Tip</span><span className="text-white">${Number(tipAmountUSDC).toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-white/50">Fee</span><span className="text-white/80">${Number(feeAmountUSDC).toFixed(2)}</span></div>
          <div className="flex justify-between pt-1 border-t border-white/10"><span className="text-white font-semibold">Total</span><span className="text-brand-400 font-semibold">${Number(totalAuthorizedUSDC).toFixed(2)}</span></div>
        </div>
      )}

      {(widgetError || error) && (
        <p className="mt-3 text-xs text-red-400">{widgetError || error}</p>
      )}

      {showOnboardingNudge && (
        <p className="mt-3 text-[11px] text-white/55">
          First time here: choose Card for fastest checkout, or Crypto for direct wallet payment.
        </p>
      )}

      <button
        onClick={paymentMethod === 'card' ? handleFiatPay : handleCryptoPay}
        disabled={
          !resolvedAddress ||
          !amount ||
          Number(amount) <= 0 ||
          processing ||
          (paymentMethod === 'crypto' && (isRecurring ? !recurringRoute : !route))
        }
        className="btn-primary w-full !h-14 mt-5 disabled:opacity-50"
      >
        {processing ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <>
            {paymentMethod === 'card' ? (
              <>
                <CreditCard size={16} /> Pay with Card
              </>
            ) : (
              <>
                {publicKey ? <Wallet size={16} /> : <Wallet size={16} />}
                {publicKey ? (isRecurring ? 'Start Monthly Support' : 'Pay with Crypto') : 'Connect Wallet'}
              </>
            )}
            <ArrowRight size={16} />
          </>
        )}
      </button>
    </div>
  );
}
