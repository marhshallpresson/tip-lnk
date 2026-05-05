import { useState, useEffect } from 'react';
import { CreditCard, Landmark, ArrowRight, ArrowDownLeft, Clock, CheckCircle, Loader2, Mail, ShieldCheck, User } from 'lucide-react';
import api from '../lib/api';
import { usePajRamp } from '../hooks/usePajRamp';
import { useWallet } from '../contexts/WalletContext';
import { useConnection } from '../contexts/WalletContext';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { createTransferInstruction, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';

export default function PayoutPanel() {
  const { 
    sessionToken, initiateAuth, verifyOTP, banks, loadingBanks, 
    fetchBanks, resolveAccount, createOrder, getRate, error: rampError 
  } = usePajRamp();
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();

  const [ngnAmount, setNgnAmount] = useState('');
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const [rampStep, setRampStep] = useState('amount');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpTimeLeft, setOtpTimeLeft] = useState(300); // Phase 2: OTP timer (5 minutes)
  const [selectedBank, setSelectedBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [resolvedName, setResolvedName] = useState('');
  const [rateInfo, setRateInfo] = useState(null);
  const [creatorBalance, setCreatorBalance] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        // Phase 2: Check balance first before showing withdrawal
        const balRes = await api.get('/payouts/balance');
        if (balRes.ok && balRes.data?.balance !== undefined) {
          setCreatorBalance(balRes.data.balance);
          
          // Only show history if balance > 0
          if (balRes.data.balance > 0) {
            const res = await api.get('/payouts/history');
            if (res.ok && res.data?.history) {
              setPayoutHistory(res.data.history);
            }
          }
        }
      } catch (err) {
        console.error('❌ Failed to fetch payout history/balance:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHistory();
    
    // Phase 2: Poll for real-time payout history updates every 5 seconds
    const pollInterval = setInterval(async () => {
      try {
        const res = await api.get('/payouts/history');
        if (res.ok && res.data?.history) {
          setPayoutHistory(res.data.history);
        }
      } catch (err) {
        console.error('Payout history poll failed:', err);
      }
    }, 5000);
    
    return () => clearInterval(pollInterval);
  }, []);

  useEffect(() => {
    if (ngnAmount && Number(ngnAmount) >= 1) {
      const timer = setTimeout(async () => {
        const rate = await getRate(Number(ngnAmount));
        setRateInfo(rate);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setRateInfo(null);
    }
  }, [ngnAmount, getRate]);

  // Phase 2: OTP expiration timer
  useEffect(() => {
    if (rampStep !== 'verify') return;
    
    const timer = setInterval(() => {
      setOtpTimeLeft(t => {
        if (t <= 1) {
          setError('❌ OTP expired. Request a new code.');
          setRampStep('amount');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [rampStep]);

  const handleStartAuth = async () => {
    if (!email) return;
    setProcessing(true);
    try {
      await initiateAuth(email);
      setRampStep('verify');
      // Email preserved for subsequent steps
    } catch (err) {
      setError(err.message);
      // Preserve email for retry
    } finally {
      setProcessing(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp) return;
    setProcessing(true);
    try {
      await verifyOTP(email, otp);
      setRampStep('bank');
      fetchBanks();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleResolveAccount = async () => {
    if (!selectedBank || !accountNumber) return;
    setProcessing(true);
    try {
      const name = await resolveAccount(selectedBank, accountNumber);
      setResolvedName(name);
      setRampStep('confirm');
    } catch (err) {
      setError('Could not resolve bank account. Please check details.');
    } finally {
      setProcessing(false);
    }
  };

  const handleExecuteOfframp = async () => {
    if (!publicKey) return;
    
    // Add confirmation step before actual withdrawal
    const confirmed = window.confirm(
      `Confirm withdrawal of ${ngnAmount} USDC?\n\nYou will receive approximately ₦${rateInfo?.totalReceived.toLocaleString() || 'N/A'}\n\nThis action cannot be undone.`
    );
    
    if (!confirmed) {
      return;
    }

    setProcessing(true);
    setError(null);
    try {
      const order = await createOrder(Number(ngnAmount), selectedBank, accountNumber);
      const depositAddress = new PublicKey(order.address);

      const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
      const fromAta = await getAssociatedTokenAddress(USDC_MINT, publicKey);
      const toAta = await getAssociatedTokenAddress(USDC_MINT, depositAddress);

      const transaction = new Transaction();

      try {
        const accountInfo = await connection.getAccountInfo(toAta);
        if (!accountInfo) {
          console.log('🛡️ Pent Test: Destination ATA missing. Adding creation instruction.');
          transaction.add(
            createAssociatedTokenAccountInstruction(
              publicKey,
              toAta,
              depositAddress,
              USDC_MINT
            )
          );
        }
      } catch (e) {
        console.warn('ATA check error, assuming missing:', e);
      }
      
      transaction.add(
        createTransferInstruction(
          fromAta,
          toAta,
          publicKey,
          Math.floor(Number(ngnAmount) * 1_000_000)
        )
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signed = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(signature);

      setRampStep('amount');
      setNgnAmount('');
      const historyRes = await api.get('/payouts/history');
      if (historyRes.ok && historyRes.data?.history) {
        setPayoutHistory(historyRes.data.history);
      }
    } catch (err) {
      console.error('Offramp error', err);
      setError(err.message || 'Withdrawal failed to execute');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  
        {/* Pajcash NGN Off-ramp Integrated */}
        <div className="glass-card p-6 border-accent-orange/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent-orange/5 blur-3xl -mr-16 -mt-16 pointer-events-none" />
          
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2 text-accent-orange">
                <Landmark size={18} /> Nigerian Payout (NGN)
              </h3>
              <p className="text-surface-400 text-sm mt-1">Convert USDC directly to local bank account</p>
            </div>
            <img src="/pajcash-logo.png" alt="PajCash" className="h-5 opacity-50 grayscale hover:opacity-100 transition-all" />
          </div>

          <div className="space-y-4">
            {rampStep === 'amount' && (
              <div className="animate-slide-up">
                {/* Phase 2: Balance validation - show upfront */}
                {creatorBalance !== null && (
                  <div className={`mb-4 p-4 rounded-xl border ${
                    creatorBalance > 0 
                      ? 'bg-emerald-500/10 border-emerald-500/20' 
                      : 'bg-red-500/10 border-red-500/20'
                  }`}>
                    <p className="text-xs font-semibold text-white/60 mb-1">Available Balance</p>
                    <p className={`text-2xl font-bold ${
                      creatorBalance > 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      ${creatorBalance.toFixed(2)} USDC
                    </p>
                    {creatorBalance <= 0 && (
                      <p className="text-[10px] text-red-400 mt-2">
                        ⚠️ You need at least $1 USDC to withdraw.
                      </p>
                    )}
                  </div>
                )}
                
                <div className="bg-surface-800/50 p-5 rounded-2xl border border-surface-700 focus-within:border-accent-orange/50 transition-all">
                  <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-3 block">Amount to Withdraw (USDC)</label>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-black text-surface-500">$</span>
                    <input 
                      type="number" 
                      value={ngnAmount}
                      onChange={(e) => setNgnAmount(e.target.value)}
                      className="bg-transparent border-none outline-none text-3xl font-black w-full placeholder:text-surface-700"
                      placeholder="50.00"
                      disabled={creatorBalance === null || creatorBalance <= 0}
                    />
                  </div>
                </div>
                
                {rateInfo && (
                  <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-surface-500">Current Rate:</span>
                      <span className="font-mono text-white">₦ {rateInfo.rate.toLocaleString()} / USDC</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-surface-400">Total NGN:</span>
                      <span className="text-accent-orange">₦ {rateInfo.totalReceived.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-surface-600">
                      <span>Protocol Fee:</span>
                      <span>₦ {rateInfo.userTax.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <button 
                  onClick={() => sessionToken ? setRampStep('bank') : setRampStep('auth')}
                  disabled={!ngnAmount || Number(ngnAmount) < 1 || creatorBalance === null || creatorBalance <= 0}
                  className="btn-primary w-full mt-6 py-4 rounded-2xl bg-accent-orange text-black font-black uppercase tracking-tighter shadow-lg shadow-accent-orange/10 flex items-center justify-center gap-2"
                >
                  Continue to Payout <ArrowRight size={18} />
                </button>
              </div>
            )}

            {rampStep === 'auth' && (
              <div className="animate-slide-up space-y-4">
                <div className="flex items-center gap-2 text-accent-orange mb-2">
                   <Mail size={16} /> <span className="text-xs font-bold uppercase tracking-widest">Verify Identity</span>
                </div>
                <p className="text-xs text-surface-400 leading-relaxed">Enter your email to receive a secure OTP for PajCash verification.</p>
                <div className="bg-surface-800/50 p-4 rounded-2xl border border-surface-700 focus-within:border-accent-orange/30">
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-transparent border-none outline-none text-lg font-bold w-full text-white"
                    placeholder="your@email.com"
                  />
                </div>
                <button 
                  onClick={handleStartAuth}
                  disabled={processing || !email}
                  className="btn-primary w-full py-4 rounded-2xl bg-white text-black font-bold uppercase tracking-widest text-xs"
                >
                  {processing ? <Loader2 className="animate-spin" size={16} /> : 'Send Verification Code'}
                </button>
                <button onClick={() => setRampStep('amount')} className="w-full text-[10px] text-surface-500 font-bold uppercase tracking-widest">Back</button>
              </div>
            )}

            {rampStep === 'verify' && (
              <div className="animate-slide-up space-y-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 text-accent-orange">
                     <ShieldCheck size={16} /> <span className="text-xs font-bold uppercase tracking-widest">Enter OTP</span>
                  </div>
                  {/* Phase 2: OTP expiration timer */}
                  <span className="text-[10px] text-sky-500 font-bold">
                    Expires in {Math.floor(otpTimeLeft / 60)}:{String(otpTimeLeft % 60).padStart(2, '0')}
                  </span>
                </div>
                <p className="text-xs text-surface-400 leading-relaxed">We've sent a code to <span className="text-white font-bold">{email}</span></p>
                <div className="bg-surface-800/50 p-4 rounded-2xl border border-surface-700 focus-within:border-accent-orange/30">
                  <input 
                    type="text" 
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="bg-transparent border-none outline-none text-2xl font-black tracking-[0.5em] text-center w-full"
                    placeholder="000000"
                    maxLength={6}
                  />
                </div>
                <button 
                  onClick={handleVerifyOTP}
                  disabled={processing || otp.length < 4 || otpTimeLeft <= 0}
                  className="btn-primary w-full py-4 rounded-2xl bg-accent-orange text-black font-bold uppercase tracking-widest text-xs"
                >
                  {processing ? <Loader2 className="animate-spin" size={16} /> : 'Verify & Continue'}
                </button>
              </div>
            )}

            {rampStep === 'bank' && (
              <div className="animate-slide-up space-y-4">
                 <div className="flex items-center gap-2 text-accent-orange mb-2">
                   <Landmark size={16} /> <span className="text-xs font-bold uppercase tracking-widest">Bank Details</span>
                </div>
                <div className="space-y-3">
                  <select 
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full bg-surface-800/50 border border-surface-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-accent-orange/50"
                    onFocus={fetchBanks}
                  >
                    <option value="">Select your bank</option>
                    {banks.map(bank => <option key={bank.id} value={bank.id}>{bank.name}</option>)}
                  </select>

                  <div className="bg-surface-800/50 p-4 rounded-xl border border-surface-700 focus-within:border-accent-orange/30">
                    <label className="text-[10px] font-bold text-surface-500 uppercase mb-1 block">Account Number</label>
                    <input 
                      type="text" 
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="bg-transparent border-none outline-none text-lg font-bold w-full text-white"
                      placeholder="0123456789"
                      maxLength={10}
                    />
                  </div>
                </div>

                <button 
                  onClick={handleResolveAccount}
                  disabled={processing || !selectedBank || accountNumber.length < 10}
                  className="btn-primary w-full py-4 rounded-2xl bg-white text-black font-bold uppercase tracking-widest text-xs"
                >
                  {processing ? <Loader2 className="animate-spin" size={16} /> : 'Validate Account'}
                </button>
                <button onClick={() => setRampStep('amount')} className="w-full text-[10px] text-surface-500 font-bold uppercase tracking-widest">Cancel</button>
              </div>
            )}

            {rampStep === 'confirm' && (
               <div className="animate-slide-up space-y-6">
                  <div className="p-4 rounded-2xl bg-accent-green/10 border border-accent-green/20">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-accent-green/20 flex items-center justify-center text-accent-green">
                           <User size={20} />
                        </div>
                        <div>
                           <p className="text-[10px] font-bold text-accent-green uppercase tracking-widest">Account Holder</p>
                           <p className="text-sm font-bold text-white uppercase">{resolvedName}</p>
                        </div>
                     </div>
                     
                     <div className="space-y-2 pt-4 border-t border-white/5">
                        <div className="flex justify-between text-xs">
                           <span className="text-surface-500">Bank:</span>
                           <span className="text-white font-bold">{banks.find(b => b.id === selectedBank)?.name}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                           <span className="text-surface-500">Withdraw:</span>
                           <span className="text-white font-bold">{ngnAmount} USDC</span>
                        </div>
                        <div className="flex justify-between text-sm pt-2">
                           <span className="text-surface-500 font-bold">You receive:</span>
                           <span className="text-accent-orange font-black">₦ {rateInfo?.totalReceived.toLocaleString()}</span>
                        </div>
                     </div>
                  </div>

                  <button 
                    onClick={handleExecuteOfframp}
                    disabled={processing}
                    className="btn-primary w-full py-5 rounded-2xl bg-brand-500 text-black font-black uppercase tracking-tighter shadow-2xl shadow-brand-500/20 flex items-center justify-center gap-3"
                  >
                    {processing ? <Loader2 className="animate-spin" size={20} /> : <><ShieldCheck size={20} /> Confirm & Send</>}
                  </button>
                  <button onClick={() => setRampStep('bank')} className="w-full text-[10px] text-surface-500 font-bold uppercase tracking-widest">Edit Details</button>
               </div>
            )}

            {(error || rampError) && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-bold text-center uppercase tracking-widest">{error || rampError}</div>}
          </div>
        </div>

        {/* Standard Fiat/Crypto Payouts (Simplified for Tip Stack Style) */}
        <div className="glass-card p-6 border-white/5 flex flex-col justify-between">
           <div>
              <h3 className="text-lg font-bold flex items-center gap-2 mb-2">
                <CreditCard size={18} className="text-brand-400" /> Card & Global Payout
              </h3>
              <p className="text-surface-500 text-sm">International withdrawals via Stripe Connect</p>
           </div>
           
           <div className="py-10 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 opacity-50">
                 <Clock size={24} className="text-surface-600" />
              </div>
              <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Coming Soon for Creators</p>
           </div>

           <button disabled className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white/20 font-bold uppercase tracking-widest text-[10px] cursor-not-allowed">
              Link Global Account
           </button>
        </div>

      </div>

      {/* Payout History */}
      <div className="glass-card p-6 border-white/5">
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <Clock size={18} className="text-white/40" /> Withdrawal History
        </h3>
        
        <div className="overflow-x-auto">
          {loading ? (
             <div className="flex justify-center py-10"><Loader2 className="animate-spin text-brand-500" /></div>
          ) : payoutHistory.length === 0 ? (
             <div className="text-center py-12">
                <p className="text-[10px] font-bold text-white/10 uppercase tracking-[0.3em]">No Payout Activity</p>
             </div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="text-white/20 text-[10px] uppercase font-black tracking-widest border-b border-white/5">
                  <th className="pb-4 px-4">Date</th>
                  <th className="pb-4 px-4">Asset</th>
                  <th className="pb-4 px-4">Destination</th>
                  <th className="pb-4 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {payoutHistory.map((payout) => (
                  <tr key={payout.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-4 px-4 text-white/40 font-mono text-xs">
                      {new Date(payout.date).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-white">{Number(payout.amountUSDC).toFixed(2)} USDC</span>
                        <span className="text-[10px] text-accent-orange font-bold">₦ {Number(payout.amountNGN).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Landmark size={12} className="text-white/20" />
                        <span className="text-white/60 font-medium">Nigerian Bank</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
                          payout.status === 'completed' || payout.status === 'successful' 
                            ? 'bg-accent-green/10 text-accent-green border-accent-green/20' 
                            : payout.status === 'failed'
                            ? 'bg-red-500/10 text-red-500 border-red-500/20'
                            : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                        }`}>
                        {payout.status === 'completed' || payout.status === 'successful' ? <CheckCircle size={10} /> : null}
                        {payout.status}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

