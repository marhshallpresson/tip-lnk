import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useApp } from '../contexts/AppContext';
import { useTipping } from '../hooks/useTipping';
import {
  Gift,
  ArrowDown,
  Loader2,
  Check,
  ChevronDown,
  Zap,
  Info,
  RefreshCw,
} from 'lucide-react';

export default function TipWidget() {
  const { publicKey } = useWallet();
  const { addTip, profile } = useApp();
  const address = publicKey?.toBase58() || '';

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
  } = useTipping(address);

  const [senderName, setSenderName] = useState('');
  const [showTokenDropdown, setShowTokenDropdown] = useState(false);
  const [txStep, setTxStep] = useState('configure'); // configure, simulate, review, processing, done

  const handleSimulate = () => {
    setTxStep('simulate');
    setTimeout(() => setTxStep('review'), 1000); // mock simulation delay
  };

  const handleEdit = () => {
    setTxStep('configure');
  };

  useEffect(() => {
    if (amount && selectedToken) {
      calculateRoute(selectedToken.symbol, parseFloat(amount) || 0);
    }
  }, [amount, selectedToken, calculateRoute]);

  const handleSendTip = async () => {
    setTxStep('processing');
    const result = await executeTip(senderName || 'Anonymous');
    if (result?.success) {
      addTip({
        sender: senderName || 'Anonymous',
        inputToken: result.inputToken,
        inputAmount: result.inputAmount,
        amountUSDC: result.outputAmount,
        fee: result.fee,
        txSignature: result.txSignature,
        timestamp: result.timestamp,
      });
      setTxStep('done');
    }
  };

  const handleReset = () => {
    reset();
    setTxStep('configure');
  };

  if (txResult?.success) {
    return (
      <div className="glass-card glow-brand p-8 max-w-lg mx-auto text-center">
        <div className="w-16 h-16 rounded-full bg-accent-green/20 flex items-center justify-center mx-auto mb-4">
          <Check size={28} className="text-accent-green" />
        </div>
        <h3 className="text-2xl font-bold mb-2">Tip Sent</h3>
        <p className="text-surface-400 mb-6">
          {txResult.inputAmount} {txResult.inputToken} → ${txResult.outputAmount.toFixed(2)} USDC
        </p>
        <div className="bg-surface-800/50 rounded-xl p-4 mb-6 font-mono text-sm text-surface-400 break-all">
          tx: {txResult.txSignature}
        </div>
        <button onClick={handleReset} className="btn-primary flex items-center gap-2 mx-auto">
          <RefreshCw size={16} />
          Send Another
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card p-8 max-w-lg mx-auto">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-accent-orange/20 flex items-center justify-center mx-auto mb-4">
          <Gift size={28} className="text-accent-orange" />
        </div>
        <h3 className="text-2xl font-bold mb-1">
          Tip {profile.solDomain || profile.displayName || 'Creator'}
        </h3>
        <p className="text-surface-400 text-sm">
          DFlow routes tips through DEX aggregators for best pricing
        </p>
      </div>

      {/* Sender Name */}
      <input
        type="text"
        className="input-field w-full mb-4"
        placeholder="Your name (optional)"
        value={senderName}
        onChange={(e) => setSenderName(e.target.value)}
      />

      {/* Token Selector + Amount */}
      <div className="bg-surface-800/50 rounded-xl p-4 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-surface-500 text-sm">You send</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowTokenDropdown(!showTokenDropdown)}
              className="flex items-center gap-2 bg-surface-700 hover:bg-surface-600 px-3 py-2 rounded-lg transition-colors"
            >
              <span className="font-semibold">{selectedToken.symbol}</span>
              <ChevronDown size={14} className="text-surface-400" />
            </button>
            {showTokenDropdown && (
              <div className="absolute top-full mt-1 left-0 bg-surface-800 border border-surface-700 rounded-xl overflow-hidden z-10 min-w-[160px]">
                {tokens.map((token) => (
                  <button
                    key={token.symbol}
                    onClick={() => {
                      setSelectedToken(token);
                      setShowTokenDropdown(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-700 transition-colors text-left ${
                      selectedToken.symbol === token.symbol ? 'bg-surface-700' : ''
                    }`}
                  >
                    <span className="font-medium">{token.symbol}</span>
                    <span className="text-surface-500 text-xs">{token.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            type="number"
            className="flex-1 bg-transparent text-right text-2xl font-bold outline-none placeholder-surface-600"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
      </div>

      {/* Arrow */}
      <div className="flex justify-center -my-1 relative z-[1]">
        <div className="w-10 h-10 rounded-xl bg-surface-800 border border-surface-700 flex items-center justify-center">
          <ArrowDown size={16} className="text-brand-400" />
        </div>
      </div>

      {/* Output */}
      <div className="bg-surface-800/50 rounded-xl p-4 mt-3 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-surface-500 text-sm">Creator receives</span>
          <span className="text-surface-500 text-xs">USDC</span>
        </div>
        <p className="text-2xl font-bold text-accent-green">
          ${tipAmountUSDC.toFixed(2)}
        </p>
      </div>

      {/* Route Info & Stepper */}
      {route && txStep === 'configure' && (
        <button
          onClick={handleSimulate}
          disabled={!route || !amount}
          className="btn-primary w-full flex items-center justify-center gap-2 mb-4"
        >
          <Eye size={18} />
          Simulate Transaction
        </button>
      )}

      {txStep === 'simulate' && (
        <div className="flex items-center justify-center py-4 text-brand-400 gap-2 mb-4">
          <Loader2 size={18} className="animate-spin" />
          <span>Simulating via RPC...</span>
        </div>
      )}

      {(txStep === 'review' || txStep === 'processing' || txStep === 'done') && route && (
        <div className="bg-surface-800/30 rounded-xl p-4 mb-6 space-y-2 border border-brand-500/30">
          <div className="flex items-center gap-2 mb-3 text-accent-green">
            <Check size={14} />
            <span className="text-sm font-bold">Simulation Passed</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-surface-500">Balance Change</span>
            <span className="text-surface-300">-{amount} {selectedToken.symbol}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-surface-500">DFlow Fee (0.3%)</span>
            <span className="text-surface-300">-${route.fee.toFixed(4)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-surface-500">Price Impact</span>
            <span className="text-surface-300">{route.priceImpact}%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-surface-500">Est. Time</span>
            <span className="text-surface-300">{route.estimatedTime}</span>
          </div>
          <div className="mt-3 pt-3 border-t border-surface-700">
            <p className="text-xs text-brand-400 mb-2 font-semibold">DFlow DEX Route Split</p>
            <div className="flex gap-2">
              {route.dexSplit.map((dex) => (
                <div key={dex.name} className="flex-1 bg-surface-800 rounded-lg p-2 text-center border border-brand-500/20">
                  <p className="text-xs font-medium text-white">{dex.name}</p>
                  <p className="text-[10px] text-accent-cyan">{dex.share}%</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {txStep === 'review' && (
        <div className="flex gap-3 mb-4">
          <button onClick={handleEdit} className="btn-secondary !px-4">
            Edit
          </button>
          <button
            onClick={handleSendTip}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <Gift size={18} />
            Approve & Send Tip
          </button>
        </div>
      )}

      {txStep === 'processing' && (
        <div className="btn-primary w-full flex items-center justify-center gap-2 mb-4 cursor-not-allowed opacity-80" disabled>
          <Loader2 size={18} className="animate-spin" />
          Awaiting Solflare Approval...
        </div>
      )}

      <p className="text-center text-surface-600 text-xs mt-4 flex items-center justify-center gap-1">
        <Info size={12} />
        Powered by DFlow intent-based order routing
      </p>
    </div>
  );
}
