import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Wallet, Smartphone, ArrowRight, CheckCircle, HelpCircle, Loader2, ChevronLeft, Mail, Chrome, User, Lock, Eye, EyeOff, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { BrowserSDK, AddressType } from '@phantom/browser-sdk';

// --- Phantom SDK Setup ---
const PHANTOM_APP_ID = import.meta.env.VITE_PHANTOM_APP_ID || "YOUR_APP_ID_HERE";
const phantomSdk = new BrowserSDK({
  providers: ["google", "injected"], // Apple removed as requested
  appId: PHANTOM_APP_ID,
  addressTypes: [AddressType.solana],
  autoConnect: true, // Handles redirect result on page load!
  authOptions: { redirectUrl: window.location.origin + window.location.pathname },
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
  const { login, register, user: authUser } = useAuth();
  const isSolflare = useIsSolflare();
  const isPhantom = useIsPhantom();
  const [view, setView] = useState('wallets'); // selection, wallets, email-login, email-register, email-success
  const [advancing, setAdvancing] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [countdown, setCountdown] = useState(5);
  const navigate = useNavigate();

  const noWalletsInstalled = !isPhantom && !isSolflare;

  // Handle connection events from Phantom SDK (crucial for social login callback)
  useEffect(() => {
    const handleConnect = (connectEvent) => {
      console.log("Phantom SDK Connect Event:", connectEvent);
      if (connectEvent.publicKey) {
        onConnected(connectEvent.publicKey.toBase58());
      }
    };

    phantomSdk.on('connect', handleConnect);
    
    // Check if autoConnect already resolved a connection
    if (phantomSdk.isConnected && phantomSdk.publicKey) {
        onConnected(phantomSdk.publicKey.toBase58());
    }

    return () => {
      phantomSdk.off('connect', handleConnect);
    };
  }, [onConnected]);

  useEffect(() => {
    if (connected && publicKey && !advancing) {
      setAdvancing(true);
      onConnected(publicKey.toBase58());
    }
  }, [connected, publicKey, onConnected, advancing]);

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
    try {
      console.log(`Initiating Phantom ${provider} connection...`);
      // Signature for Browser SDK is connect(providerName)
      const result = await phantomSdk.connect(provider);
      
      if (result && result.publicKey) {
        onConnected(result.publicKey.toBase58());
      }
    } catch (err) {
      console.error(`Phantom ${provider} Login Error:`, err);
      setAuthError(err.message || 'An unknown error occurred during login.');
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
      } else {
        result = await register(formData.name, formData.email, formData.password);
      }

      if (result.success) {
        // After email registration, we show a success screen prompting for wallet
        if (view === 'email-register') {
            setView('email-success');
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
  
  if (view === 'email-success') {
    return (
        <div className="glass-card glow-brand p-8 sm:p-10 text-center animate-slide-up relative overflow-hidden">
            <div className="w-16 h-16 rounded-full bg-accent-green/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={32} className="text-accent-green" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Account Created!</h2>
            <p className="text-surface-400 text-sm mb-8 leading-relaxed">
                Your profile is ready. To start receiving tips and earning rewards, you must **connect a Solana wallet**.
            </p>
            <div className="space-y-4">
                <button onClick={() => setView('wallets')} className="btn-primary w-full flex items-center justify-center gap-2">
                    <Wallet size={18} /> Connect My Wallet Now
                </button>
                <button onClick={() => setView('email')} className="text-surface-500 hover:text-white text-xs font-bold transition-colors">
                    Back to options
                </button>
            </div>
        </div>
    );
  }

  if (view === 'email-login' || view === 'email-register') {
    const isLogin = view === 'email-login';
    return (
        <div className="glass-card glow-brand p-8 sm:p-10 text-center animate-slide-up relative overflow-hidden">
        <div className="flex items-center justify-between mb-8">
            <button onClick={() => setView('email')} className="p-2 rounded-xl bg-surface-900 border border-surface-800 text-surface-400 hover:text-white transition-all">
                <ChevronLeft size={20} />
            </button>
            <h2 className="text-2xl font-black text-white text-center flex-1">{isLogin ? 'Sign In' : 'Create Account'}</h2>
            <div className="w-8"></div>
        </div>
        
        {authError && (
            <div className="mb-6 p-4 bg-accent-red/10 border border-accent-red/20 rounded-xl text-accent-red text-xs text-left">
                {authError}
            </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
            {!isLogin && (
                <div>
                    <label className="text-xs font-bold text-surface-400 uppercase ml-1">Full Name</label>
                    <div className="relative mt-1">
                        <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-500" />
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
                <label className="text-xs font-bold text-surface-400 uppercase ml-1">Email Address</label>
                <div className="relative mt-1">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-500" />
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
                <label className="text-xs font-bold text-surface-400 uppercase ml-1">Password</label>
                <div className="relative mt-1">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-500" />
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
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 transition-colors"
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
            </div>
            <button 
                type="submit" 
                disabled={loadingProvider === 'email'}
                className="btn-primary w-full !mt-6 flex items-center justify-center gap-2"
            >
                {loadingProvider === 'email' && <Loader2 size={18} className="animate-spin" />}
                {isLogin ? 'Sign In' : 'Create Account'}
            </button>
        </form>

        <p className="mt-8 text-sm text-surface-400">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
            <button 
                onClick={() => setView(isLogin ? 'email-register' : 'email-login')}
                className="text-brand-400 font-bold hover:text-brand-300 underline underline-offset-4"
            >
                {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
        </p>
      </div>
    );
  }

  if (view === 'selection') {
    return (
      <div className="glass-card glow-brand p-8 sm:p-10 text-center animate-slide-up relative overflow-hidden bg-white/5 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => setView('wallets')} className="p-2 rounded-xl bg-surface-900 border border-surface-800 text-surface-400 hover:text-white transition-all">
            <ChevronLeft size={20} />
          </button>
          <div className="w-8"></div>
        </div>
        
        <div className="mb-8">
          <h2 className="text-2xl font-black text-white mb-2">You're one step away</h2>
          <p className="text-surface-400 text-sm">From earning in global standards</p>
        </div>

        <div className="space-y-6">
          <button 
            onClick={() => handleSocialSelect('google')} 
            disabled={loadingProvider !== null} 
            className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-[#6366f1] hover:bg-[#5558e3] text-white font-bold transition-all shadow-lg shadow-indigo-500/20"
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
          
          <div className="flex items-center gap-4 text-surface-600">
            <div className="h-px flex-1 bg-surface-800"></div>
            <span className="text-[10px] font-black uppercase tracking-widest">OR</span>
            <div className="h-px flex-1 bg-surface-800"></div>
          </div>

          <button 
            onClick={() => setView('email-login')} 
            className="w-full flex items-center justify-center gap-3 py-4 rounded-xl border border-surface-700 bg-transparent text-surface-200 font-bold hover:bg-surface-800 hover:border-surface-600 transition-all"
          >
            <Mail size={20} />
            Continue with Email
          </button>
        </div>
        
        <p className="mt-8 text-[11px] text-surface-500 leading-relaxed px-4">
          By using this website, you agree to our <a href="/terms" className="text-surface-300 hover:text-white underline">Terms of Use</a> and our <a href="/privacy" className="text-surface-300 hover:text-white underline">Privacy Policy</a>.
        </p>

        {authError && <div className="mt-6 text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">{authError}</div>}
      </div>
    );
  }

  return (
    <div className="glass-card glow-brand p-8 sm:p-10 text-center animate-slide-up relative overflow-hidden bg-white/5 backdrop-blur-xl">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-600/30 to-brand-800/20 flex items-center justify-center mx-auto mb-6"><Wallet size={36} className="text-brand-400" /></div>
      <h2 className="text-3xl font-black mb-3 text-white">Connect & Earn</h2>
      <p className="text-surface-500 text-sm mb-8">Access the most powerful creator hub on Solana.</p>

      {noWalletsInstalled && (
        <div className="mb-8 text-left bg-surface-900/80 p-4 rounded-2xl border border-surface-800">
            <h3 className="font-bold text-white mb-2 flex items-center gap-2"><Chrome size={16} /> First, you need a wallet</h3>
            <p className="text-xs text-surface-400 mb-4 leading-relaxed">A wallet is your gateway to Web3. We recommend installing one of these browser extensions to get the full experience.</p>
            <div className="grid grid-cols-2 gap-3">
                <a href="https://phantom.app/download" target="_blank" rel="noopener noreferrer" className="btn-secondary !py-2.5 !px-3 text-[11px] flex items-center justify-center gap-2 border-phantom-purple/30 hover:border-phantom-purple transition-all">
                    <img src="https://phantom.app/favicon.ico" alt="Phantom" className="w-4 h-4" /> Install Phantom
                </a>
                 <a href="https://solflare.com/download" target="_blank" rel="noopener noreferrer" className="btn-secondary !py-2.5 !px-3 text-[11px] flex items-center justify-center gap-2 border-solflare/30 hover:border-solflare transition-all">
                    <img src="https://solflare.com/favicon.ico" alt="Solflare" className="w-4 h-4" /> Install Solflare
                </a>
            </div>
        </div>
      )}

      {(!connected || !publicKey) && (
        <>
          <div className="flex justify-center mb-6"><WalletMultiButton /></div>
          <div className="grid grid-cols-1 gap-4">
            <button onClick={() => setView('selection')} className="w-full flex items-center justify-between p-5 rounded-[24px] bg-surface-900 border border-surface-800 hover:border-brand-500 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-500 group-hover:scale-110 transition-transform"><User size={20} /></div>
                <div className="text-left">
                  <p className="font-bold text-sm text-white">Google / Email Login</p>
                  <p className="text-[10px] text-surface-500 text-left">No wallet? Start here to auto-create one.</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-surface-700 group-hover:text-brand-500 transition-colors" />
            </button>
          </div>

        </>
      )}

      {connected && publicKey && (
        <div className="mt-8 animate-scale-in">
          <div className="bg-accent-green/10 border border-accent-green/30 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-accent-green/20 flex items-center justify-center">
                <CheckCircle size={24} className="text-accent-green" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Successfully Connected</h3>
            <p className="text-accent-green font-medium text-xs font-mono">
              {publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-8)}
            </p>
            
            <div className="flex justify-center gap-2 mt-3">
              {isSolflareWallet && <span className="badge-solflare text-[10px] px-3 py-1">Solflare Wallet ✓</span>}
              {isPhantomWallet && <span className="badge-phantom text-[10px] px-3 py-1">Phantom Wallet ✓</span>}
            </div>
          </div>

          <div className="space-y-4">
            <button 
              onClick={() => navigate('/dashboard')}
              className="btn-primary w-full py-4 flex items-center justify-center gap-2 text-lg"
            >
              <LayoutDashboard size={20} />
              Go to Dashboard
            </button>
            
            <p className="text-surface-500 text-sm">
              Redirecting in <span className="text-brand-400 font-bold font-mono">{countdown}s</span>...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
