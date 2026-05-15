import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Loader2, Zap, ShieldCheck } from 'lucide-react';

export default function QRCheckoutModal({ isOpen, onClose, intentId, creatorId, amount, tokenMint, onSuccess, onConnect }) {
  const [status, setStatus] = useState('pending');

  useEffect(() => {
    if (!isOpen || !intentId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/status?intentId=${intentId}`);
        const data = await res.json();
        if (data.status === 'completed') {
          setStatus('completed');
          clearInterval(interval);
          setTimeout(() => onSuccess?.(data), 1500);
        }
      } catch (e) { console.error(e); }
    }, 2000);
    return () => clearInterval(interval);
  }, [isOpen, intentId, onSuccess]);

  if (!isOpen) return null;

  const solanaPayUri = `solana:https://tipstack.fun/api/solana/actions/tip/${creatorId}?amount=${amount}${tokenMint ? `&spl-token=${tokenMint}` : ''}&intentId=${intentId}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0f0f11] border border-white/5 rounded-[32px] p-8 max-w-sm w-full text-center relative animate-scale-in shadow-2xl">
        <button onClick={onClose} className="absolute top-6 right-6 text-white/20 hover:text-white transition-colors">
          <X size={20} />
        </button>
        
        <h3 className="text-xl font-black text-white mb-2">Scan to Pay</h3>
        <p className="text-white/40 text-xs mb-8">Open Phantom or Solflare on your mobile device to complete the tip.</p>

        <div className="bg-white p-4 rounded-3xl inline-block mb-6 shadow-inner">
          <QRCodeSVG value={solanaPayUri} size={200} level="H" includeMargin />
        </div>

        {onConnect && (
            <>
                <div className="mb-4">
                  <span className="text-white/20 text-[10px] font-bold uppercase">OR</span>
                </div>
                <button 
                  onClick={() => { onClose(); onConnect(); }}
                  className="w-full py-3 px-4 bg-brand-500/10 text-brand-500 text-sm font-bold rounded-xl border border-brand-500/20 hover:bg-brand-500/20 transition-all mb-6"
                >
                  Connect Wallet
                </button>
            </>
        )}

        <div className="flex items-center justify-center gap-2 text-brand-500 font-bold text-sm mb-6 animate-pulse">
          {status === 'completed' ? <Zap size={16} /> : <Loader2 size={16} className="animate-spin" />}
          {status === 'completed' ? 'Payment Confirmed!' : 'Waiting for mobile approval...'}
        </div>

        <div className="flex items-center justify-center gap-4 py-4 border-t border-white/5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                <ShieldCheck size={12} className="text-brand-500/50" /> Secure
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                <Zap size={12} className="text-brand-500/50" /> Instant
            </div>
        </div>
      </div>
    </div>
  );
}
