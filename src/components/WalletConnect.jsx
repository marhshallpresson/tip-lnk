import { useEffect, useState, useCallback, useMemo } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Smartphone, CheckCircle, Loader2, X, ChevronLeft, Mail, Chrome, User, Lock, Eye, EyeOff, Wallet as WalletIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { phantomSdk } from '../lib/phantom';
import api from '../lib/api';
import bs58 from 'bs58';

/* Detect Solflare in-app browser */
function useIsSolflare() {
  const [isSolflare, setIsSolflare] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
        const ua = navigator.userAgent || '';
        setIsSolflare(ua.toLowerCase().includes('solflare') || !!window.solflare);
    }, 100);
    return () => clearTimeout(timer);
  }, []);
  return isSolflare;
}

/* Detect Phantom in-app browser */
function useIsPhantom() {
  const [isPhantom, setIsPhantom] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
        setIsPhantom(!!window.phantom?.solana?.isPhantom);
    }, 100);
    return () => clearTimeout(timer);
  }, []);
  return isPhantom;
}

export default function WalletConnect({ onConnected }) {
  const { publicKey, connected, connect, select, wallets, signMessage } = useWallet();
  const { setVisible } = useWalletModal();
  const { login, register, user, loginWithWallet, refreshUser, checkEmailStatus, initLoginOtp, verifyLoginOtp } = useAuth();
  const isSolflare = useIsSolflare();
  const isPhantom = useIsPhantom();
  
  const detectedWallets = useMemo(() => 
    wallets.filter(w => w.readyState === 'Installed' || w.readyState === 'Loadable'),
    [wallets]
  );

  const [view, setView] = useState('wallets'); 
  const [loginPhase, setLoginPhase] = useState('email'); // 'email', 'password', 'otp-prompt', 'otp-verify'
  const [advancing, setAdvancing] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', code: '' });
  const navigate = useNavigate();

  const handleWalletSelect = async (walletName) => {
    try {
      setLoadingProvider(walletName);
      select(walletName);
      // The connect() will be handled by the useEffect or autoConnect
    } catch (err) {
      setAuthError('Failed to select wallet.');
      setLoadingProvider(null);
    }
  };

  useEffect(() => {
    if (loadingProvider && wallets.find(w => w.adapter.name === loadingProvider)?.adapter.connected) {
        setLoadingProvider(null);
    }
  }, [wallets, loadingProvider]);

  const performSiwsLogin = useCallback(async (addr, providerType = 'adapter') => {
    try {
      const timestamp = new Date().toISOString();
      const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const requestId = crypto.randomUUID();
      const domain = window.location.hostname;
      const uri = window.location.origin + '/';

      const message = `${domain} wants you to sign in with your Solana account:
${addr}

Welcome to Tip Stack. Signing is the only way we can truly know that you are the owner of the wallet you are connecting. Signing is a safe, gas-less transaction that does not in any way give Tip Stack permission to perform any transactions with your wallet.

URI: ${uri}
Version: 1
Nonce: ${nonce}
Issued At: ${timestamp}
Request ID: ${requestId}`;

      const messageBytes = new TextEncoder().encode(message);
      let signatureStr;

      if (providerType === 'google' || providerType === 'injected_sdk') {
        const p = providerType === 'google' ? 'google' : 'injected';
        const result = await phantomSdk.signMessage({ provider: p, message: messageBytes });
        signatureStr = bs58.encode(result.signature);
      } else {
        if (!signMessage) throw new Error("Wallet does not support message signing");
        const signatureBytes = await signMessage(messageBytes);
        signatureStr = bs58.encode(signatureBytes);
      }

      const res = await loginWithWallet(addr, signatureStr, message);
      if (res.success) {
        if (!res.user?.email) {
          setView('email-prompt');
          return;
        }
        onConnected(addr, true);
      }
    } catch (err) {
      console.error("SIWS error:", err);
      setAuthError(err.message || 'Signature failed. Please try again.');
    } finally {
      setLoadingProvider(null);
      setAdvancing(false);
    }
  }, [loginWithWallet, onConnected, signMessage]);

  const handleSocialSelect = async (provider) => {
    if (!provider) return;
    if (provider === 'google') {
      loginWithGoogle();
      return;
    }
    
    setLoadingProvider(provider);
    setAuthError(null);

    try {
        const result = await phantomSdk.connect({ provider: provider === 'google' ? 'google' : 'injected' });
        if (result && result.publicKey) {
          await performSiwsLogin(result.publicKey.toBase58(), provider === 'google' ? 'google' : 'injected_sdk');
        }
    } catch (err) {
        setAuthError(err.message || 'Connection failed.');
        setLoadingProvider(null);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoadingProvider('email');
    setAuthError(null);
    
    try {
      if (view === 'email-login') {
        if (loginPhase === 'email') {
          const status = await checkEmailStatus(formData.email);
          if (status.success) {
            if (!status.exists) {
              setAuthError('No account found with this email. Please register first.');
            } else if (status.hasPassword) {
              setLoginPhase('password');
            } else if (status.isVerified) {
              setLoginPhase('otp-prompt');
            } else {
              setAuthError('Email not verified. Please contact support or sign in with your wallet.');
            }
          } else {
            setAuthError(status.error);
          }
        } else if (loginPhase === 'password') {
          const result = await login(formData.email, formData.password);
          if (result.success) {
            onConnected(result.user?.walletAddress, true);
          } else {
            setAuthError(result.error);
          }
        } else if (loginPhase === 'otp-prompt') {
          const result = await initLoginOtp(formData.email);
          if (result.success) {
            setLoginPhase('otp-verify');
          } else {
            setAuthError(result.error);
          }
        } else if (loginPhase === 'otp-verify') {
          const result = await verifyLoginOtp(formData.email, formData.code);
          if (result.success) {
            onConnected(result.user?.walletAddress, true);
          } else {
            setAuthError(result.error);
          }
        }
      } else if (view === 'email-register') {
        const result = await register(formData.name, formData.email, formData.password);
        if (result.success) setView('email-verify');
        else setAuthError(result.error);
      } else if (view === 'email-reset') {
        const res = await api.post('/auth/reset-password-start', { email: formData.email });
        if (res.ok && res.data.success) setView('email-reset-sent');
        else setAuthError(res.data.error || 'Failed to send reset email.');
      } else if (view === 'email-prompt') {
          if (!formData.name || formData.name.trim().length < 2) {
            setAuthError('Please enter your full name (at least 2 characters).');
            setLoadingProvider(null);
            return;
          }
          const res = await api.post('/auth/link-email/start', { email: formData.email, name: formData.name });
          if (res.ok && res.data.success) setView('email-verify');
          else setAuthError(res.data.error || 'Failed to send verification email.');
      } else if (view === 'email-verify') {
          const res = await api.post('/auth/link-email/verify', { 
            email: formData.email, 
            code: formData.code,
            name: formData.name 
          });
          if (res.ok && res.data.success) {
              await refreshUser();
              setView('email-success');
          } else {
              setAuthError(res.data.error || 'Invalid or expired verification code.');
          }
      }
    } catch (err) {
      setAuthError('An unexpected error occurred.');
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (view === 'email-reset') {
    return (
        <div className="glass-card p-8 sm:p-10 text-center animate-slide-up">
            <div className="flex items-center justify-between mb-8">
                <button onClick={() => setView('email-login')} className="p-2 rounded-lg bg-[#1a1a1a] border border-white/10 text-white/40 hover:text-white transition-all">
                    <ChevronLeft size={20} />
                </button>
                <h2 className="text-xl font-bold text-white text-center flex-1">Reset Password</h2>
                <div className="w-8"></div>
            </div>
            <p className="text-white/40 text-sm mb-8 leading-relaxed text-left">
                Enter your email address and we'll send you a link to reset your password.
            </p>
            {authError && <div className="mb-6 p-4 bg-red-500/5 border border-red-500/10 rounded-lg text-red-500 text-xs text-left">{authError}</div>}
            <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
                <div className="relative mt-1">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                    <input type="email" name="email" required value={formData.email} onChange={handleInputChange} className="input-field w-full !pl-12" placeholder="your@email.com" />
                </div>
                <button type="submit" disabled={loadingProvider !== null} className="btn-primary w-full !mt-6">
                    {loadingProvider === 'email' ? <Loader2 size={18} className="animate-spin" /> : 'Send Reset Link'}
                </button>
            </form>
        </div>
    );
  }

  if (view === 'email-reset-sent') {
    return (
        <div className="glass-card p-8 sm:p-10 text-center animate-slide-up">
            <div className="w-12 h-12 rounded-lg bg-brand-500/10 flex items-center justify-center mx-auto mb-6">
                <Mail size={24} className="text-brand-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
            <p className="text-white/40 text-sm mb-8 leading-relaxed">
                If an account exists for <span className="text-white font-semibold">{formData.email}</span>, we've sent a password reset link.
            </p>
            <button onClick={() => setView('email-login')} className="btn-secondary w-full mt-8">Back to Login</button>
        </div>
    );
  }

  if (view === 'email-prompt' || view === 'email-register') {
    const isRegister = view === 'email-register';
    const isPrompt = view === 'email-prompt';
    return (
        <div className="glass-card p-8 sm:p-10 text-center animate-slide-up">
            <div className="w-12 h-12 rounded-lg bg-brand-500/10 flex items-center justify-center mx-auto mb-6">
                <User size={24} className="text-brand-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{isRegister ? 'Create Account' : 'Finalize Profile'}</h2>
            <p className="text-white/40 text-sm mb-8">
                {isRegister ? 'Join Tip Stack to start earning.' : 'To secure your account, please provide your name and email.'}
            </p>
            {authError && <div className="mb-6 p-4 bg-red-500/5 border border-red-500/10 rounded-lg text-red-500 text-xs text-left">{authError}</div>}
            <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
                {(isRegister || isPrompt) && (
                  <div className="relative mt-1">
                      <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                      <input type="text" name="name" required value={formData.name} onChange={handleInputChange} className="input-field w-full !pl-12" placeholder="Full Name" />
                  </div>
                )}
                <div className="relative mt-1">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                    <input type="email" name="email" required value={formData.email} onChange={handleInputChange} className="input-field w-full !pl-12" placeholder="your@email.com" />
                </div>
                {isRegister && (
                  <div className="relative mt-1">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                      <input type={showPassword ? "text" : "password"} name="password" required value={formData.password} onChange={handleInputChange} className="input-field w-full !pl-12 !pr-12" placeholder="Password" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors">
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                  </div>
                )}
                <button type="submit" disabled={loadingProvider !== null} className="btn-primary w-full !mt-6">
                    {loadingProvider === 'email' ? <Loader2 size={18} className="animate-spin" /> : 'Continue'}
                </button>
            </form>
            {isRegister && <button onClick={() => setView('wallets')} className="mt-4 text-xs text-white/20 hover:text-white transition-colors">Back to Wallets</button>}
        </div>
    );
  }

  if (view === 'email-verify') {
    return (
        <div className="glass-card p-8 sm:p-10 text-center animate-slide-up">
            <Mail size={32} className="text-brand-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
            <p className="text-white/40 text-sm mb-8 leading-relaxed">
                We've sent a 6-digit verification code to <span className="text-white font-semibold">{formData.email}</span>.
            </p>
            {authError && <div className="mb-6 p-4 bg-red-500/5 border border-red-500/10 rounded-lg text-red-500 text-xs text-left">{authError}</div>}
            <form onSubmit={handleEmailAuth} className="space-y-6">
                <div className="flex justify-center">
                    <input type="text" name="code" maxLength={6} required autoFocus value={formData.code} onChange={handleInputChange} className="w-full max-w-[240px] h-14 bg-[#0f0f0f] border border-white/10 rounded-lg text-center text-2xl tracking-[0.3em] font-bold text-white focus:border-brand-500 transition-all outline-none" placeholder="000000" />
                </div>
                <button type="submit" disabled={loadingProvider !== null} className="btn-primary w-full">
                    {loadingProvider === 'email' ? <Loader2 size={18} className="animate-spin" /> : 'Verify'}
                </button>
            </form>
            <button onClick={() => setView('email-prompt')} className="mt-8 text-white/40 hover:text-white text-xs font-semibold transition-colors uppercase tracking-wider">
                Change Email Address
            </button>
        </div>
    );
  }

  if (view === 'email-success') {
    return (
        <div className="glass-card p-8 sm:p-10 text-center animate-slide-up">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={24} className="text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Verified!</h2>
            <p className="text-white/40 text-sm mb-8 leading-relaxed">
                Your email is verified. Let's finish setting up your account.
            </p>
            <button onClick={() => onConnected(publicKey?.toBase58(), true)} className="btn-primary w-full">
                Continue
            </button>
        </div>
    );
  }

  if (view === 'email-login') {
    return (
        <div className="glass-card p-8 sm:p-10 text-center animate-slide-up">
            <div className="flex items-center justify-between mb-8">
                <button onClick={() => {
                  if (loginPhase === 'email') setView('wallets');
                  else setLoginPhase('email');
                }} className="p-2 rounded-lg bg-[#1a1a1a] border border-white/10 text-white/40 hover:text-white transition-all"><ChevronLeft size={20} /></button>
                <h2 className="text-xl font-bold text-white text-center flex-1">
                  {loginPhase === 'email' ? 'Sign In' : loginPhase === 'password' ? 'Enter Password' : 'Verify Identity'}
                </h2>
                <div className="w-8"></div>
            </div>
            {authError && <div className="mb-6 p-4 bg-red-500/5 border border-red-500/10 rounded-lg text-red-500 text-xs text-left">{authError}</div>}
            
            <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
                {loginPhase === 'email' && (
                  <div className="relative mt-1">
                      <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                      <input type="email" name="email" required value={formData.email} onChange={handleInputChange} className="input-field w-full !pl-12" placeholder="your@email.com" />
                  </div>
                )}

                {loginPhase === 'password' && (
                  <>
                    <div className="relative mt-1">
                        <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                        <input type={showPassword ? "text" : "password"} name="password" required value={formData.password} onChange={handleInputChange} className="input-field w-full !pl-12 !pr-12" placeholder="••••••••" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors">
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    <div className="flex justify-end">
                        <button type="button" onClick={() => setView('email-reset')} className="text-[10px] font-semibold text-brand-500 hover:text-brand-400 transition-colors">Forgot Password?</button>
                    </div>
                  </>
                )}

                {loginPhase === 'otp-prompt' && (
                  <p className="text-white/40 text-sm mb-4">
                    Your account is linked to <span className="text-white font-semibold">{formData.email}</span> but has no password. We'll send a 6-digit code to sign you in.
                  </p>
                )}

                {loginPhase === 'otp-verify' && (
                  <div className="flex justify-center py-4">
                      <input type="text" name="code" maxLength={6} required autoFocus value={formData.code} onChange={handleInputChange} className="w-full max-w-[240px] h-14 bg-[#0f0f0f] border border-white/10 rounded-lg text-center text-2xl tracking-[0.3em] font-bold text-white focus:border-brand-500 transition-all outline-none" placeholder="000000" />
                  </div>
                )}

                <button type="submit" disabled={loadingProvider === 'email'} className="btn-primary w-full !mt-6">
                    {loadingProvider === 'email' ? <Loader2 size={18} className="animate-spin mx-auto" /> : 
                     loginPhase === 'email' ? 'Continue' : 
                     loginPhase === 'otp-prompt' ? 'Send Code' : 
                     loginPhase === 'otp-verify' ? 'Sign In' : 'Sign In'}
                </button>
            </form>
            
            {loginPhase === 'email' && (
              <p className="mt-8 text-sm text-white/40">Don't have an account? <button onClick={() => setView('email-register')} className="text-brand-500 font-semibold hover:text-brand-400">Sign Up</button></p>
            )}
        </div>
    );
  }

  return (
    <div className="glass-card !bg-[#0f0f11] !border-white/5 p-6 sm:p-8 max-w-[400px] mx-auto animate-slide-up relative overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-bold text-white">Connect Tip Stack</h2>
         </div>

      <div className="space-y-3">
        <button onClick={() => handleSocialSelect('google')} disabled={loadingProvider !== null} className="w-full h-14 rounded-xl bg-white text-black hover:bg-white/90 transition-all font-bold flex items-center justify-center gap-3">
          {loadingProvider === 'google' ? <Loader2 size={20} className="animate-spin text-black" /> : <><Chrome size={20} /> Continue with Google</>}
        </button>

        <div className="relative py-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest"><span className="bg-[#0f0f11] px-4 text-white/20">or connect wallet</span></div>
        </div>

        {!connected ? (
            <div className="flex flex-col gap-2">
                {detectedWallets.map((wallet) => (
                    <button
                        key={wallet.adapter.name}
                        onClick={() => handleWalletSelect(wallet.adapter.name)}
                        disabled={loadingProvider !== null}
                        className="w-full h-14 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center justify-between px-6 group"
                    >
                        <div className="flex items-center gap-3">
                            <img src={wallet.adapter.icon} alt={wallet.adapter.name} className="w-6 h-6" />
                            <span className="font-bold text-sm">{wallet.adapter.name}</span>
                        </div>
                        {loadingProvider === wallet.adapter.name ? (
                            <Loader2 size={16} className="animate-spin text-white/40" />
                        ) : (
                            <ChevronLeft size={16} className="text-white/20 rotate-180 group-hover:text-white transition-colors" />
                        )}
                    </button>
                ))}
                
                <button 
                    onClick={() => setVisible(true)}
                    className="mt-2 w-full py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-white transition-colors flex items-center justify-center gap-2"
                >
                    <WalletIcon size={12} /> More Wallets
                </button>
            </div>
        ) : (
            <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-6 text-center animate-scale-in">
                <p className="text-brand-500 font-black text-xs uppercase tracking-widest mb-1">Wallet Linked</p>
                <p className="text-white font-mono text-[10px] truncate mb-4">{publicKey?.toBase58()}</p>
                <button 
                  onClick={() => { setAdvancing(true); performSiwsLogin(publicKey.toBase58(), 'adapter'); }} 
                  disabled={advancing}
                  className="btn-primary w-full"
                >
                  {advancing ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Continue'}
                </button>
            </div>
        )}
      </div>

      <button onClick={() => setView('email-login')} className="w-full h-14 rounded-xl bg-brand-500 text-black hover:bg-brand-400 transition-all font-bold flex items-center justify-center gap-3 mt-4">
        {loadingProvider === 'email' ? <Loader2 size={20} className="animate-spin text-black" /> : <><Mail size={20} /> Continue with Email</>}
      </button>

      {authError && <div className="mt-6 text-red-500 text-[10px] bg-red-500/5 p-3 rounded-lg border border-red-500/10 text-center">{authError}</div>}
    </div>
  );
}
