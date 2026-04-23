import { useWallet } from '@solana/wallet-adapter-react';
import { SolanaWalletProvider } from './contexts/WalletContext';
import { AppProvider, useApp } from './contexts/AppContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import StepIndicator from './components/StepIndicator';
import RoleSelection from './components/RoleSelection';
import CategorySelection from './components/CategorySelection';
import DomainRegistration from './components/DomainRegistration';
import SocialLinking from './components/SocialLinking';
import ProfileEditor from './components/ProfileEditor';
import OnboardingComplete from './components/OnboardingComplete';
import WalletModal from './components/WalletModal';
import LandingPage from './components/LandingPage';
import CreatorPage from './components/CreatorPage';
import Dashboard from './components/Dashboard';
import { OverviewTab, TransactionHistoryTab } from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import AppNavbar from './components/AppNavbar';
import ResetPassword from './components/ResetPassword';
import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';

const TermsOfService = lazy(() => import('./components/legal/TermsOfService.jsx'));
const PrivacyPolicy = lazy(() => import('./components/legal/PrivacyPolicy.jsx'));


// Auto-scroll to top on navigation
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppContent() {
  const { role, onboardingStep, update } = useApp();
  const { showWalletModal, setShowWalletModal } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleGetStarted = () => {
    if (role === 'guest') {
      setShowWalletModal(true);
    } else {
      // Both 'user' and 'creator' roles go to dashboard
      navigate('/dashboard');
    }
  };

  const nextStep = useCallback(() => {
    update({ onboardingStep: onboardingStep + 1 });
  }, [onboardingStep, update]);

  const prevStep = useCallback(() => {
    if (onboardingStep > 0) {
      update({ onboardingStep: onboardingStep - 1 });
    }
  }, [onboardingStep, update]);

  const finishOnboarding = useCallback(() => {
    // ─── ELITE COMPLETION TRIGGER ───
    update({ onboardingComplete: true });
    localStorage.setItem('onboarding_just_finished', 'true');
    navigate('/dashboard');
  }, [update, navigate]);

  return (
    <div className="min-h-screen bg-surface-950 text-white flex flex-col relative overflow-hidden">
      <ScrollToTop />
      
      {/* --- Global Background Branding --- */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-[0.03]">
          <img src="/logo.svg" className="absolute -top-20 -left-20 w-[600px] h-[600px] blur-[100px] rotate-12" alt="" />
          <img src="/logo.svg" className="absolute top-1/2 -right-40 w-[800px] h-[800px] blur-[120px] -rotate-12" alt="" />
          <img src="/logo.svg" className="absolute -bottom-40 left-1/4 w-[500px] h-[500px] blur-[80px]" alt="" />
      </div>

      {/* Standard App Navbar - Hidden on White-Label Creator Pages */}
      {!location.pathname.match(/^\/[^/]+$/) || ['/terms', '/privacy', '/onboarding', '/dashboard'].some(p => location.pathname.startsWith(p)) ? (
        <AppNavbar
          onGetStarted={handleGetStarted}
          onboardingComplete={role === 'creator'}
          connected={role !== 'guest'}
          onViewDashboard={() => navigate('/dashboard')}
          onViewProfile={() => navigate('/')}
          isDashboard={location.pathname.startsWith('/dashboard')}
        />
      ) : null}

      <main className="flex-1">
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-surface-950">
            <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        }>
          <Routes>
            <Route path="/" element={<LandingPage onGetStarted={handleGetStarted} />} />

            <Route path="/onboarding" element={
              <RequireAuth requiredRole="user">
                <div className="min-h-[calc(100vh-80px)] mt-20 flex flex-col items-center justify-center p-6">
                  <StepIndicator current={onboardingStep} />
                  <div className="w-full max-w-3xl">
                    {onboardingStep === 0 && <RoleSelection onComplete={nextStep} />}
                    {onboardingStep === 1 && <CategorySelection onComplete={nextStep} onBack={prevStep} />}
                    {onboardingStep === 2 && <DomainRegistration onComplete={nextStep} onBack={prevStep} />}
                    {onboardingStep === 3 && <SocialLinking onComplete={nextStep} onBack={prevStep} />}
                    {onboardingStep === 4 && <ProfileEditor onComplete={nextStep} onBack={prevStep} />}
                    {onboardingStep === 5 && <OnboardingComplete onFinish={finishOnboarding} onBack={prevStep} />}
                  </div>
                </div>
              </RequireAuth>
            } />

            <Route path="/dashboard/*" element={
              <RequireAuth requiredRole="creator">
                <div className="mt-20">
                  <Dashboard />
                </div>
              </RequireAuth>
            } />

            <Route path="/admin" element={
              <div className="mt-20 min-h-screen">
                <AdminDashboard />
              </div>
            } />

            <Route path="/auth/callback/:platform" element={<AuthCallbackHandler />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/:username" element={<CreatorPage />} />

            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

      {/* --- Global Elite Overlays --- */}
      <WalletModal 
        isOpen={showWalletModal} 
        onClose={() => setShowWalletModal(false)} 
        onConnected={(addr, isAuth) => {
          setShowWalletModal(false);
          if (addr || isAuth) {
             if (location.pathname === '/') navigate('/dashboard');
          }
        }}
      />
    </div>
  );
}

function RequireAuth({ children, requiredRole }) {
  const { role } = useApp();
  const { loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (role === 'guest') {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Dashboard now accepts both 'user' (incomplete) and 'creator' (complete) roles.
  // This allows us to show a 'Complete Onboarding' modal inside the dashboard.
  if (requiredRole === 'creator' && (role === 'user' || role === 'creator')) {
    return children;
  }

  // Onboarding is for users who need to finish setup
  if (requiredRole === 'user' && role === 'user') {
    return children;
  }

  if (requiredRole === 'user' && role === 'creator') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

/**
 * Real-world OAuth2 Callback Handler
 * Acts as the landing zone for official X/Discord validation.
 */
function AuthCallbackHandler() {
  const { platform } = useParams();
  const navigate = useNavigate();
  const { updateProfile } = useApp();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [error, setError] = useState(null);

  // Elite Handler: Phantom SDK uses this route as a redirect URL.
  // We must not interfere with Phantom's own message passing if it's phantom-google.
  const isPhantomGoogle = platform === 'phantom-google';

  useEffect(() => {
    if (isPhantomGoogle) return;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const errorParam = params.get('error');

    if (errorParam) {
      const errorMsg = params.get('error_description') || 'Authorization denied.';
      setError(errorMsg);
      setStatus('error');
      if (window.opener) {
        window.opener.postMessage({ type: 'OAUTH_ERROR', platform, error: errorMsg }, window.location.origin);
        setTimeout(() => window.close(), 1500);
      } else {
        setTimeout(() => navigate('/onboarding'), 3000);
      }
      return;
    }

    if (code) {
      const exchangeCode = async () => {
        try {
          const res = await api.post(`/auth/${platform}/callback`, {
            code,
            redirectUri: `${window.location.origin}/auth/callback/${platform}`
          });

          if (res.ok) {
            const data = res.data;
            updateProfile({
              socials: {
                [platform === 'twitter' ? 'twitter' : 'discord']: data.username,
                [`is${platform.charAt(0).toUpperCase() + platform.slice(1)}Verified`]: true
              }
            });

            setStatus('success');

            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_SUCCESS', platform, username: data.username }, window.location.origin);
              setTimeout(() => window.close(), 500);
            } else {
              navigate(`/onboarding?step=3&oauth_success=${platform}`);
            }
          } else {
            throw new Error(res.data?.message || 'Identity provider rejected the authorization code.');
          }
        } catch (err) {
          console.error('OAuth Exchange Error:', err);
          setError(err.message);
          setStatus('error');
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_ERROR', platform, error: err.message }, window.location.origin);
            setTimeout(() => window.close(), 2000);
          } else {
            setTimeout(() => navigate('/onboarding'), 3000);
          }
        }
      };
      exchangeCode();
    } else if (!code && !errorParam) {
      setError('No authorization code received.');
      setStatus('error');
      if (window.opener) {
        window.opener.postMessage({ type: 'OAUTH_ERROR', platform, error: 'No code received' }, window.location.origin);
        setTimeout(() => window.close(), 1500);
      }
    }
  }, [platform, navigate, updateProfile, isPhantomGoogle]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950">
      <div className="text-center animate-fade-in">
        {isPhantomGoogle ? (
           <>
            <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-white">Authenticating Wallet...</h2>
            <p className="text-surface-400 mt-2 italic">Securing link with Google infrastructure...</p>
           </>
        ) : status === 'error' ? (
          <div className="text-accent-red">
            <h2 className="text-2xl font-bold">Verification Failed</h2>
            <p className="mt-2">{error}</p>
            <p className="text-surface-500 text-sm mt-4 italic">Redirecting back...</p>
          </div>
        ) : status === 'success' ? (
          <div className="text-accent-green">
            <div className="w-16 h-16 rounded-full bg-accent-green/20 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold">Verification Successful</h2>
            <p className="text-surface-400 mt-2 italic">Your {platform} account has been linked.</p>
            <p className="text-surface-500 text-sm mt-4 italic">Closing window...</p>
          </div>
        ) : (
          <>
            <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold">Verifying Account</h2>
            <p className="text-surface-400 mt-2 italic">Securing link with {platform} infrastructure...</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <SolanaWalletProvider>
      <AuthProvider>
        <AppProvider>
          <div className="min-h-screen bg-surface-950 text-white">
            <AppContent />
          </div>
        </AppProvider>
      </AuthProvider>
    </SolanaWalletProvider>
  );
}
