import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Wallet, Smartphone, ArrowRight, CheckCircle, HelpCircle, Loader2, ChevronLeft, Mail, Chrome, User, Lock, Eye, EyeOff, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { BrowserSDK, AddressType } from '@phantom/browser-sdk';
import { getPhantomDeepLink, getSolflareDeepLink, isMobile, hasSolanaProvider } from '../utils/deepLinks';

// --- Phantom SDK Setup ---
const PHANTOM_APP_ID = import.meta.env.VITE_PHANTOM_APP_ID || "319f5dec-a0a2-4c5e-9ae8-04408426f62b";
const phantomSdk = new BrowserSDK({
  providers: ["google", "injected"],
  appId: PHANTOM_APP_ID,
  addressTypes: [AddressType.solana],
  autoConnect: true,
  // Professional Normalization: Always redirect to the origin to match registered dev settings
  authOptions: { redirectUrl: window.location.origin },
});

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
  const { connected, publicKey, wallet } = useWallet();
  const { login, register, user: authUser, loginWithWallet } = useAuth();
  const isSolflare = useIsSolflare();
  const isPhantom = useIsPhantom();
  const mobileDevice = isMobile();
  const [view, setView] = useState('wallets'); // selection, wallets, email-login, email-register, email-verify, email-success
  const [advancing, setAdvancing] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', code: '' });
  const [countdown, setCountdown] = useState(5);
  const navigate = useNavigate();

  const noWalletsInstalled = !isPhantom && !isSolflare;

  // Handle connection events from Phantom SDK (crucial for social login callback)
  useEffect(() => {
    const handleConnect = async (connectEvent) => {
      console.log("Phantom SDK Connect Event:", connectEvent);
      if (connectEvent.publicKey) {
        const addr = connectEvent.publicKey.toBase58();
        setLoadingProvider('phantom_link');
        await loginWithWallet(addr);
        setLoadingProvider(null);
        onConnected(addr);
      }
    };

    phantomSdk.on('connect', handleConnect);
    
    // Check if autoConnect already resolved a connection
    if (phantomSdk.isConnected && phantomSdk.publicKey) {
        const addr = phantomSdk.publicKey.toBase58();
        loginWithWallet(addr).then(() => onConnected(addr));
    }

    return () => {
      phantomSdk.off('connect', handleConnect);
    };
  }, [onConnected, loginWithWallet]);

  useEffect(() => {
    if (connected && publicKey && !advancing) {
      const addr = publicKey.toBase58();
      setAdvancing(true);
      loginWithWallet(addr).then(() => onConnected(addr));
    }
  }, [connected, publicKey, onConnected, advancing, loginWithWallet]);

  // Countdown and Auto-redirection logic
  useEffect(() => {
    if (connected && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (connected && countdown === 0) {
      navigate('/dashboard');
    }
  }, [connected, countdown, navigate]);

  const handleSocialSelect = async (provider) => {
    if (!provider) return;
    setLoadingProvider(provider);
    setAuthError(null);

    // ─── Professional Popup Flow for Google Phantom ───
    if (provider === 'google') {
        try {
            console.log(`Initiating Phantom Google popup connection...`);
            
            // Standardize the connect call - Must be an options object
            const result = await phantomSdk.connect({ provider: 'google' });
            
            if (result && result.publicKey) {
              const addr = result.publicKey.toBase58();
              await loginWithWallet(addr);
              onConnected(addr);
            }
        } catch (err) {
            console.error(`Phantom Google Login Error:`, err);
            setAuthError(err.message || 'Google wallet connection failed.');
        } finally {
            setLoadingProvider(null);
        }
        return;
    }

    try {
      console.log(`Initiating Phantom injected connection...`);
      const result = await phantomSdk.connect({ provider: 'injected' });
      if (result && result.publicKey) {
        onConnected(result.publicKey.toBase58());
      }
    } catch (err) {
      console.error(`Phantom injected Login Error:`, err);
      setAuthError(err.message || 'Browser wallet connection failed.');
    } finally {
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
      } else if (view === 'email-verify') {
          // Verify code (simulated for flow)
          if (formData.code.length === 6) {
              setView('email-success');
              return;
          } else {
              setAuthError('Please enter a valid 6-digit verification code.');
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
                <button type="submit" className="btn-primary w-full">
                    Verify & Continue
                </button>
            </form>
            
            <button 
                onClick={() => setView('email-register')} 
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
            <h2 className="text-2xl font-bold text-white mb-2">Account Created!</h2>
            <p className="text-white/40 text-sm mb-8 leading-relaxed">
                Your profile is ready. To start receiving tips and earning rewards, you must connect a Solana wallet.
            </p>
            <div className="space-y-4">
                <button onClick={() => setView('wallets')} className="btn-primary w-full">
                    <Wallet size={18} /> Connect My Wallet Now
                </button>
                <button onClick={() => setView('email')} className="text-white/40 hover:text-white text-xs font-semibold transition-colors">
                    Back to options
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
            <button onClick={() => setView('email')} className="p-2 rounded-lg bg-[#1a1a1a] border border-white/10 text-white/40 hover:text-white transition-all">
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

  if (view === 'selection') {
    return (
      <div className="glass-card p-8 sm:p-10 text-center animate-slide-up">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => setView('wallets')} className="p-2 rounded-lg bg-[#1a1a1a] border border-white/10 text-white/40 hover:text-white transition-all">
            <ChevronLeft size={20} />
          </button>
          <div className="w-8"></div>
        </div>
        
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Almost there</h2>
          <p className="text-white/40 text-sm">Choose your preferred sign-in method</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <button 
                onClick={() => handleSocialSelect('google')} 
                disabled={loadingProvider !== null} 
                className="btn-primary w-full !h-14 bg-white text-black hover:bg-white/90 border-none shadow-none"
            >
                {loadingProvider === 'google' ? (
                <Loader2 size={20} className="animate-spin" />
                ) : (
                <>
                    <svg width="20" height="20" viewBox="0 0 24 24" className="fill-current">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="currentColor"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor"/>
                    </svg>
                    Continue with Google
                </>
                )}
            </button>
            <p className="text-[10px] text-white/20 font-semibold uppercase tracking-wider flex items-center justify-center gap-1">
                Securely powered by <img src="https://phantom.app/favicon.ico" alt="Phantom" className="w-3 h-3 grayscale opacity-50" /> <span className="text-white/40">Phantom</span>
            </p>
          </div>
          
          <div className="flex items-center gap-4 text-white/5">
            <div className="h-px flex-1 bg-white/5"></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/10">OR</span>
            <div className="h-px flex-1 bg-white/5"></div>
          </div>

          <button 
            onClick={() => setView('email-login')} 
            className="btn-outline w-full !h-14"
          >
            <Mail size={20} className="text-white/40" />
            Continue with Email
          </button>
        </div>
        
        <p className="mt-8 text-[11px] text-white/20 leading-relaxed px-4">
          By continuing, you agree to our <a href="/terms" className="text-white/40 hover:text-white">Terms</a> and <a href="/privacy" className="text-white/40 hover:text-white">Privacy Policy</a>.
        </p>

        {authError && <div className="mt-6 text-red-500 text-xs bg-red-500/5 p-3 rounded-lg border border-red-500/10">{authError}</div>}
      </div>
    );
  }

  return (
    <div className="glass-card p-8 sm:p-10 text-center animate-slide-up">
      <div className="w-16 h-16 rounded-xl bg-brand-500/10 flex items-center justify-center mx-auto mb-6">
        <Wallet size={32} className="text-brand-500" />
      </div>
      <h2 className="text-2xl font-bold mb-2 text-white">Connect Wallet</h2>
      <p className="text-white/40 text-sm mb-10">Access the most powerful creator hub on Solana.</p>

      {mobileDevice && !hasSolanaProvider() && (
        <div className="flex flex-col gap-3 mb-8">
            <button
                onClick={() => window.location.href = getPhantomDeepLink(window.location.href)}
                className="btn-primary w-full !h-14 bg-[#AB9FF2] hover:bg-[#9081E6] !text-white border-none shadow-none"
            >
                <img src="https://phantom.app/favicon.ico" alt="Phantom" className="w-5 h-5 rounded-full" />
                Open in Phantom
            </button>
            <button
                onClick={() => window.location.href = getSolflareDeepLink(window.location.href)}
                className="btn-primary w-full !h-14 bg-[#E78E3A] hover:bg-[#D67C28] !text-white border-none shadow-none"
            >
                <img src="https://solflare.com/favicon.ico" alt="Solflare" className="w-5 h-5 rounded-full" />
                Open in Solflare
            </button>
            <p className="text-center text-[10px] text-white/20 font-semibold uppercase tracking-wider mt-4">
                In-app browser required for secure signing
            </p>
        </div>
      )}

      {noWalletsInstalled && !mobileDevice && (
        <div className="mb-8 text-left bg-white/[0.02] p-5 rounded-xl border border-white/5">
            <h3 className="font-semibold text-white mb-2 flex items-center gap-2 text-sm"><Chrome size={16} className="text-white/40" /> Install a wallet</h3>
            <p className="text-xs text-white/40 mb-6 leading-relaxed">A wallet is your gateway to the on-chain world. We recommend installing one of these extensions.</p>
            <div className="grid grid-cols-2 gap-3">
                <a href="https://phantom.app/download" target="_blank" rel="noopener noreferrer" className="btn-secondary !py-2.5 !px-3 text-[11px] border-white/5">
                    <img src="https://phantom.app/favicon.ico" alt="Phantom" className="w-4 h-4" /> Phantom
                </a>
                 <a href="https://solflare.com/download" target="_blank" rel="noopener noreferrer" className="btn-secondary !py-2.5 !px-3 text-[11px] border-white/5">
                    <img src="https://solflare.com/favicon.ico" alt="Solflare" className="w-4 h-4" /> Solflare
                </a>
            </div>
        </div>
      )}

      {(!connected || !publicKey) && (
        <>
          <div className="flex justify-center mb-8"><WalletMultiButton /></div>
          <div className="grid grid-cols-1 gap-4">
            <button onClick={() => setView('selection')} className="w-full flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-brand-500/50 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-500"><User size={20} /></div>
                <div className="text-left">
                  <p className="font-semibold text-sm text-white">Social / Email Login</p>
                  <p className="text-[10px] text-white/20">No wallet? Create one instantly.</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-white/10 group-hover:text-brand-500 transition-colors" />
            </button>
          </div>

        </>
      )}

      {connected && publicKey && (
        <div className="mt-8 animate-scale-in">
          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-8 mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle size={24} className="text-emerald-500" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Connected</h3>
            <p className="text-emerald-500/80 font-medium text-xs font-mono">
              {publicKey.toBase58().slice(0, 12)}...{publicKey.toBase58().slice(-12)}
            </p>
            
            <div className="flex justify-center gap-2 mt-6">
              {isSolflareWallet && <span className="badge badge-solflare">Solflare Connected</span>}
              {isPhantomWallet && <span className="badge badge-phantom">Phantom Connected</span>}
            </div>
          </div>

          <div className="space-y-6">
            <button 
              onClick={() => navigate('/dashboard')}
              className="btn-primary w-full !h-14"
            >
              <LayoutDashboard size={20} />
              Continue to Dashboard
            </button>
            
            <p className="text-white/20 text-xs font-medium uppercase tracking-wider">
              Redirecting in <span className="text-brand-500 font-bold">{countdown}s</span>...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

