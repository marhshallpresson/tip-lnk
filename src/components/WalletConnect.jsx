import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Smartphone, CheckCircle, Loader2, X, ChevronLeft, Mail, Chrome, User, Lock, Eye, EyeOff } from 'lucide-react';
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
  const { login, register, user, loginWithWallet, refreshUser } = useAuth();
  const isSolflare = useIsSolflare();
  const isPhantom = useIsPhantom();
  
  // Views: 'wallets', 'email-login', 'email-register', 'email-prompt', 'email-verify', 'email-success', 'email-reset', 'email-reset-sent'
  const [view, setView] = useState('wallets'); 
  const [advancing, setAdvancing] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', code: '' });
  const navigate = useNavigate();

  const performSiwsLogin = useCallback(async (addr, providerType = 'adapter') => {
    try {
      const timestamp = Date.now();
      const message = `Welcome to TipLnk!\n\nSign this message to authenticate your wallet. This is a secure, off-chain action that will not cost any gas.\n\nWallet: ${addr}\nTimestamp: ${timestamp}`;
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
        // Elite Flow Enforcement: Check for Email
        if (!res.user?.email) {
          setView('email-prompt');
          return;
        }
        // Fully authenticated: pass to App.jsx for routing
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

  // Phantom SDK Events
  useEffect(() => {
    const handleConnect = async (connectEvent) => {
      if (connectEvent.publicKey) {
        const addr = connectEvent.publicKey.toBase58();
        setLoadingProvider('phantom_link');
        await performSiwsLogin(addr, 'injected_sdk');
      }
    };
    phantomSdk.on('connect', handleConnect);
    
    if (phantomSdk.isConnected && phantomSdk.publicKey && !advancing) {
        const addr = phantomSdk.publicKey.toBase58();
        setAdvancing(true);
        performSiwsLogin(addr, 'injected_sdk');
    }
    return () => phantomSdk.off('connect', handleConnect);
  }, [performSiwsLogin, advancing]);

  // Standard Wallet Events
  useEffect(() => {
    const isAlreadyLoggedIn = user && user.walletAddress === publicKey?.toBase58();
    if (connected && publicKey && !advancing && !isAlreadyLoggedIn) {
      // Auto-trigger SIWS is disabled to prevent "Connection rejected" errors
      // from overlapping auto-connect handshakes. The user must click "Continue".
    }
  }, [connected, publicKey, advancing, user]);

  // Deep Link Auto-Connect
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('autoConnect') === 'true' && !advancing) {
      if (isPhantom) {
        const timer = setTimeout(() => handleSocialSelect('injected'), 500);
        return () => clearTimeout(timer);
      } else if (isSolflare) {
        const solflareWallet = wallets.find(w => w.adapter.name.toLowerCase().includes('solflare'));
        if (solflareWallet) {
          select(solflareWallet.adapter.name);
          const timer = setTimeout(() => {
             if (!connected) connect().catch(e => console.error(e));
          }, 500);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [isPhantom, isSolflare, advancing, wallets, select, connect, connected]);

  const handleSocialSelect = async (provider) => {
    if (!provider) return;
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
        const result = await login(formData.email, formData.password);
        if (result.success) {
          if (!result.user?.walletAddress) {
             setView('wallets'); // Require wallet link
             return;
          }
          onConnected(result.user.walletAddress, true);
        } else {
          setAuthError(result.error);
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
                {isRegister ? 'Join TipLnk to start earning.' : 'To secure your account, please provide your name and email.'}
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
                <button onClick={() => setView('wallets')} className="p-2 rounded-lg bg-[#1a1a1a] border border-white/10 text-white/40 hover:text-white transition-all"><ChevronLeft size={20} /></button>
                <h2 className="text-xl font-bold text-white text-center flex-1">Sign In</h2>
                <div className="w-8"></div>
            </div>
            {authError && <div className="mb-6 p-4 bg-red-500/5 border border-red-500/10 rounded-lg text-red-500 text-xs text-left">{authError}</div>}
            <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
                <div className="relative mt-1">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                    <input type="email" name="email" required value={formData.email} onChange={handleInputChange} className="input-field w-full !pl-12" placeholder="your@email.com" />
                </div>
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
                <button type="submit" disabled={loadingProvider === 'email'} className="btn-primary w-full !mt-6">
                    {loadingProvider === 'email' ? <Loader2 size={18} className="animate-spin" /> : 'Sign In'}
                </button>
            </form>
            <p className="mt-8 text-sm text-white/40">Don't have an account? <button onClick={() => setView('email-register')} className="text-brand-500 font-semibold hover:text-brand-400">Sign Up</button></p>
        </div>
    );
  }

  return (
    <div className="glass-card !bg-[#0f0f11] !border-white/5 p-6 sm:p-8 max-w-[400px] mx-auto animate-slide-up relative overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-bold text-white">Connect TipLnk</h2>
        <button onClick={() => navigate(-1)} className="p-1 rounded-lg text-white/40 hover:text-white transition-colors"><X size={20} /></button>
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
            <div className="flex flex-col gap-3">
               
                <div className="flex justify-center opacity-30 hover:opacity-100 transition-opacity scale-90"><WalletMultiButton /></div>
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

      <button onClick={() => setView('email-login')} className="mt-8 w-full text-[11px] text-white/20 hover:text-brand-400 font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
        <Mail size={12} /> Use Email / Password
      </button>

      {authError && <div className="mt-6 text-red-500 text-[10px] bg-red-500/5 p-3 rounded-lg border border-red-500/10 text-center">{authError}</div>}
    </div>
  );
}
