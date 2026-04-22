import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Wallet, Smartphone, ArrowRight, CheckCircle, HelpCircle, Loader2, X, ChevronLeft, Mail, Chrome, User, Lock, Eye, EyeOff, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { phantomSdk } from '../lib/phantom';
import { getPhantomDeepLink, getSolflareDeepLink, isMobile, hasSolanaProvider } from '../utils/deepLinks';
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
  const { publicKey, disconnect, connected, connect, select, wallets, signMessage, wallet } = useWallet();
  const { login, register, user, loginWithWallet } = useAuth();
  const isSolflare = useIsSolflare();
  const isPhantom = useIsPhantom();
  const mobileDevice = isMobile();
  const [view, setView] = useState('wallets'); // selection, wallets, email-login, email-register, email-verify, email-success, email-prompt
  const [advancing, setAdvancing] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', code: '' });
  const [countdown, setCountdown] = useState(5);
  const navigate = useNavigate();

  const noWalletsInstalled = !isPhantom && !isSolflare;

  const performSiwsLogin = useCallback(async (addr, providerType = 'adapter') => {
    try {
      const message = `Welcome to TipLnk!\n\nClick to sign in and accept the TipLnk Terms of Service. This request will not trigger a blockchain transaction or cost any gas fees.\n\nWallet: ${addr}\nTimestamp: ${Date.now()}`;
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
        onConnected(addr);
      }
    } catch (err) {
      console.error("SIWS error:", err);
      setAuthError(err.message || 'Signature failed. Please try again.');
    } finally {
      setLoadingProvider(null);
      setAdvancing(false);
    }
  }, [loginWithWallet, onConnected, signMessage]);

  // Handle connection events from Phantom SDK (crucial for social login callback)
  useEffect(() => {
    const handleConnect = async (connectEvent) => {
      console.log("Phantom SDK Connect Event:", connectEvent);
      if (connectEvent.publicKey) {
        const addr = connectEvent.publicKey.toBase58();
        setLoadingProvider('phantom_link');
        await performSiwsLogin(addr, 'injected_sdk');
      }
    };

    phantomSdk.on('connect', handleConnect);
    
    // Check if autoConnect already resolved a connection
    if (phantomSdk.isConnected && phantomSdk.publicKey && !advancing) {
        const addr = phantomSdk.publicKey.toBase58();
        setAdvancing(true);
        performSiwsLogin(addr, 'injected_sdk');
    }

    return () => {
      phantomSdk.off('connect', handleConnect);
    };
  }, [performSiwsLogin, advancing]);

  useEffect(() => {
    // Only trigger SIWS if we have a wallet but no matching auth session
    const isAlreadyLoggedIn = user && user.walletAddress === publicKey?.toBase58();
    
    if (connected && publicKey && !advancing && !isAlreadyLoggedIn) {
      const addr = publicKey.toBase58();
      setAdvancing(true);
      performSiwsLogin(addr, 'adapter');
    }
  }, [connected, publicKey, advancing, performSiwsLogin, user]);

  useEffect(() => {
    // Perform auto-connect if redirected via explicit deep link
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('autoConnect') === 'true' && !advancing) {
      if (isPhantom) {
        const timer = setTimeout(() => {
          handleSocialSelect('injected');
        }, 500);
        return () => clearTimeout(timer);
      } else if (isSolflare) {
        const solflareWallet = wallets.find(w => w.adapter.name.toLowerCase().includes('solflare'));
        if (solflareWallet) {
          select(solflareWallet.adapter.name);
          const timer = setTimeout(() => {
             // Standard wallet adapter should auto-connect but we can force it if needed
             if (!connected) connect().catch(e => console.error('AutoConnect error:', e));
          }, 500);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [isPhantom, isSolflare, advancing, wallets, select, connect, connected]);

  // Countdown and Auto-redirection logic
  useEffect(() => {
    if (connected && countdown > 0 && view !== 'email-prompt' && view !== 'email-verify') {
      const timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (connected && countdown === 0 && view !== 'email-prompt' && view !== 'email-verify') {
      navigate('/dashboard');
    }
  }, [connected, countdown, navigate, view]);

  const handleSocialSelect = async (provider) => {
    if (!provider) return;
    setLoadingProvider(provider);
    setAuthError(null);

    // ─── Professional Popup Flow for Google Phantom ───
    if (provider === 'google') {
        try {
            console.log(`Initiating Phantom Google connection...`);
            
            const result = await phantomSdk.connect({ provider: 'google' });
            
            if (result && result.publicKey) {
              const addr = result.publicKey.toBase58();
              await performSiwsLogin(addr, 'google');
            }
        } catch (err) {
            console.error(`Phantom Google Login Error:`, err);
            setAuthError(err.message || 'Google wallet connection failed.');
            setLoadingProvider(null);
        }
        return;
    }

    try {
      console.log(`Initiating Phantom injected connection...`);
      const result = await phantomSdk.connect({ provider: 'injected' });
      if (result && result.publicKey) {
        await performSiwsLogin(result.publicKey.toBase58(), 'injected_sdk');
      }
    } catch (err) {
      console.error(`Phantom injected Login Error:`, err);
      setAuthError(err.message || 'Browser wallet connection failed.');
      setLoadingProvider(null);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoadingProvider('email');
    setAuthError(null);
    
    try {
      let result;
      if (view === 'email-login') {
        result = await login(formData.email, formData.password);
      } else if (view === 'email-register') {
        result = await register(formData.name, formData.email, formData.password);
      } else if (view === 'email-reset') {
        const res = await api.post('/auth/reset-password-start', { email: formData.email });
        if (res.ok && res.data.success) {
          setView('email-reset-sent');
          return;
        } else {
          setAuthError(res.data.error || 'Failed to send reset email.');
          return;
        }
      } else if (view === 'email-prompt') {
          // Send linking code
          const res = await api.post('/auth/link-email/start', { email: formData.email });
          if (res.ok && res.data.success) {
              setView('email-verify');
              return;
          } else {
              setAuthError(res.data.error || 'Failed to send verification email.');
              return;
          }
      } else if (view === 'email-verify') {
          // Verify code
          const res = await api.post('/auth/link-email/verify', { email: formData.email, code: formData.code });
          if (res.ok && res.data.success) {
              setView('email-success');
              return;
          } else {
              setAuthError(res.data.error || 'Invalid or expired verification code.');
              return;
          }
      }

      if (result.success) {
        // After email registration, we wait for verification code
        if (view === 'email-register') {
            setView('email-verify');
        } else {
            // If just logging in, we might still want them to connect a wallet
            setView('wallets');
        }
      } else {
        setAuthError(result.error);
      }
    } catch (err) {
      setAuthError('An unexpected error occurred during authentication.');
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const isSolflareWallet = wallet?.adapter?.name?.toLowerCase().includes('solflare');
  const isPhantomWallet = wallet?.adapter?.name?.toLowerCase().includes('phantom');
  
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
            
            {authError && (
                <div className="mb-6 p-4 bg-red-500/5 border border-red-500/10 rounded-lg text-red-500 text-xs text-left">
                    {authError}
                </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
                <div>
                    <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider ml-1">Email Address</label>
                    <div className="relative mt-1">
                        <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                        <input 
                            type="email" 
                            name="email" 
                            required 
                            value={formData.email}
                            onChange={handleInputChange}
                            className="input-field w-full !pl-12" 
                            placeholder="your@email.com" 
                        />
                    </div>
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
            <div className="space-y-4 mt-8">
                <button onClick={() => setView('email-login')} className="btn-secondary w-full">
                    Back to Login
                </button>
            </div>
        </div>
    );
  }

  if (view === 'email-prompt') {
    return (
        <div className="glass-card p-8 sm:p-10 text-center animate-slide-up">
            <div className="w-12 h-12 rounded-lg bg-brand-500/10 flex items-center justify-center mx-auto mb-6">
                <User size={24} className="text-brand-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Finalize your Profile</h2>
            <p className="text-white/40 text-sm mb-8 leading-relaxed">
                To secure your account and receive notifications, please provide a valid email.
            </p>
            
            {authError && (
                <div className="mb-6 p-4 bg-red-500/5 border border-red-500/10 rounded-lg text-red-500 text-xs text-left">
                    {authError}
                </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
                <div>
                    <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider ml-1">Full Name</label>
                    <div className="relative mt-1">
                        <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                        <input 
                            type="text" 
                            name="name" 
                            required 
                            value={formData.name}
                            onChange={handleInputChange}
                            className="input-field w-full !pl-12" 
                            placeholder="John Doe" 
                        />
                    </div>
                </div>
                <div>
                    <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider ml-1">Email Address</label>
                    <div className="relative mt-1">
                        <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                        <input 
                            type="email" 
                            name="email" 
                            required 
                            value={formData.email}
                            onChange={handleInputChange}
                            className="input-field w-full !pl-12" 
                            placeholder="your@email.com" 
                        />
                    </div>
                </div>
                <button type="submit" disabled={loadingProvider !== null} className="btn-primary w-full !mt-6">
                    {loadingProvider === 'email' ? <Loader2 size={18} className="animate-spin" /> : 'Continue'}
                </button>
            </form>
        </div>
    );
  }

  if (view === 'email-verify') {
    return (
        <div className="glass-card p-8 sm:p-10 text-center animate-slide-up">
            <div className="w-12 h-12 rounded-lg bg-brand-500/10 flex items-center justify-center mx-auto mb-6">
                <Mail size={24} className="text-brand-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
            <p className="text-white/40 text-sm mb-8 leading-relaxed">
                We've sent a 6-digit verification code to <span className="text-white font-semibold">{formData.email}</span>.
            </p>
            
            {authError && (
                <div className="mb-6 p-4 bg-red-500/5 border border-red-500/10 rounded-lg text-red-500 text-xs text-left">
                    {authError}
                </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-6">
                <div className="flex justify-center">
                    <input 
                        type="text" 
                        name="code" 
                        maxLength={6}
                        required 
                        autoFocus
                        value={formData.code}
                        onChange={handleInputChange}
                        className="w-full max-w-[240px] h-14 bg-[#0f0f0f] border border-white/10 rounded-lg text-center text-2xl tracking-[0.3em] font-bold text-white focus:border-brand-500 transition-all outline-none" 
                        placeholder="000000" 
                    />
                </div>
                <button type="submit" disabled={loadingProvider !== null} className="btn-primary w-full">
                    {loadingProvider === 'email' ? <Loader2 size={18} className="animate-spin" /> : 'Verify & Continue'}
                </button>
            </form>
            
            <button 
                onClick={() => setView('email-prompt')} 
                className="mt-8 text-white/40 hover:text-white text-xs font-semibold transition-colors uppercase tracking-wider"
            >
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
            <h2 className="text-2xl font-bold text-white mb-2">Account Verified!</h2>
            <p className="text-white/40 text-sm mb-8 leading-relaxed">
                Your profile is now verified. You can start receiving tips and earning rewards.
            </p>
            <div className="space-y-4">
                <button onClick={() => navigate('/dashboard')} className="btn-primary w-full">
                    Continue to Dashboard
                </button>
            </div>
        </div>
    );
  }

  if (view === 'email-login' || view === 'email-register') {
    const isLogin = view === 'email-login';
    return (
        <div className="glass-card p-8 sm:p-10 text-center animate-slide-up">
        <div className="flex items-center justify-between mb-8">
            <button onClick={() => setView('wallets')} className="p-2 rounded-lg bg-[#1a1a1a] border border-white/10 text-white/40 hover:text-white transition-all">
                <ChevronLeft size={20} />
            </button>
            <h2 className="text-xl font-bold text-white text-center flex-1">{isLogin ? 'Sign In' : 'Create Account'}</h2>
            <div className="w-8"></div>
        </div>
        
        {authError && (
            <div className="mb-6 p-4 bg-red-500/5 border border-red-500/10 rounded-lg text-red-500 text-xs text-left">
                {authError}
            </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
            {!isLogin && (
                <div>
                    <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider ml-1">Full Name</label>
                    <div className="relative mt-1">
                        <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                        <input 
                            type="text" 
                            name="name" 
                            required 
                            value={formData.name}
                            onChange={handleInputChange}
                            className="input-field w-full !pl-12" 
                            placeholder="John Doe" 
                        />
                    </div>
                </div>
            )}
            <div>
                <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider ml-1">Email Address</label>
                <div className="relative mt-1">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                    <input 
                        type="email" 
                        name="email" 
                        required 
                        value={formData.email}
                        onChange={handleInputChange}
                        className="input-field w-full !pl-12" 
                        placeholder="your@email.com" 
                    />
                </div>
            </div>
            <div>
                <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider ml-1">Password</label>
                <div className="relative mt-1">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                    <input 
                        type={showPassword ? "text" : "password"} 
                        name="password" 
                        required 
                        value={formData.password}
                        onChange={handleInputChange}
                        className="input-field w-full !pl-12 !pr-12" 
                        placeholder="••••••••" 
                    />
                    <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
            </div>
            <div className="flex justify-end">
                <button 
                    type="button"
                    onClick={() => setView('email-reset')}
                    className="text-[10px] font-semibold text-brand-500 hover:text-brand-400 transition-colors"
                >
                    Forgot Password?
                </button>
            </div>
            <button 
                type="submit" 
                disabled={loadingProvider === 'email'}
                className="btn-primary w-full !mt-6"
            >
                {loadingProvider === 'email' && <Loader2 size={18} className="animate-spin" />}
                {isLogin ? 'Sign In' : 'Create Account'}
            </button>
        </form>

        <p className="mt-8 text-sm text-white/40">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
            <button 
                onClick={() => setView(isLogin ? 'email-register' : 'email-login')}
                className="text-brand-500 font-semibold hover:text-brand-400"
            >
                {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card !bg-[#0f0f11] !border-white/5 p-6 sm:p-8 max-w-[400px] mx-auto animate-slide-up relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-bold text-white">Connect Wallet</h2>
        <button 
          onClick={() => navigate(-1)} 
          className="p-1 rounded-lg text-white/40 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="space-y-4">
        {/* Primary Auth: Google */}
        <button 
          onClick={() => handleSocialSelect('google')} 
          disabled={loadingProvider !== null} 
          className="w-full h-12 rounded-xl bg-transparent border border-white/10 hover:bg-white/[0.02] hover:border-white/20 transition-all font-semibold text-white flex items-center justify-center gap-3 group"
        >
          {loadingProvider === 'google' ? (
            <Loader2 size={20} className="animate-spin text-white/40" />
          ) : (
            <>
              <div className="bg-white rounded-md p-1.5 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </div>
              Continue with Google
            </>
          )}
        </button>

      </div>

      {/* Manual Selection / Email Fallback */}
      <div className="mt-6 flex flex-col gap-4">
          {!connected && (
              <div className="flex justify-center opacity-50 hover:opacity-100 transition-opacity">
                  <WalletMultiButton />
              </div>
          )}
          
          <button 
            onClick={() => setView('email-login')}
            className="text-[11px] text-white/20 hover:text-brand-400 font-semibold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
          >
            <Mail size={12} />
            Continue with Email
          </button>
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs text-white/40 leading-relaxed text-center">
        By continuing, you acknowledge and agree to Melee's <a href="/terms" className="text-brand-400 hover:underline">Terms of Use</a> and <a href="/privacy" className="text-brand-400 hover:underline">Privacy Policy</a>.
      </p>

      {connected && publicKey && (
        <div className="mt-8 animate-scale-in text-center">
            <div className="bg-brand-500/5 border border-brand-500/10 rounded-xl p-4 mb-4">
                <p className="text-brand-400 font-mono text-[10px] truncate">
                    {publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-8)}
                </p>
            </div>
            <button 
              onClick={() => navigate('/dashboard')}
              className="btn-primary w-full !h-12"
            >
              Continue to Dashboard
            </button>
        </div>
      )}

      {authError && <div className="mt-6 text-red-500 text-[10px] bg-red-500/5 p-3 rounded-lg border border-red-500/10 text-center">{authError}</div>}
    </div>
  );
}
