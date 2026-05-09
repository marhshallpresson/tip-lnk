import { useWallet } from './contexts/WalletContext';
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
import AuthCompletion from './components/AuthCompletion';
import CreatorPage from './components/CreatorPage';
import CheckoutPage from './components/CheckoutPage';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import AppNavbar from './components/AppNavbar';
import ResetPassword from './components/ResetPassword';
import api from './lib/api';
import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { getAuthToken, useDynamicContext } from '@dynamic-labs/sdk-react-core';

const TermsOfService = lazy(() => import('./components/legal/TermsOfService.jsx'));
const PrivacyPolicy = lazy(() => import('./components/legal/PrivacyPolicy.jsx'));


function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppContent() {
  const { role, onboardingStep, update } = useApp();
  const { showWalletModal, setShowWalletModal, user: authUser, loading: authLoading, loginWithDynamic } = useAuth();
  const { user: dynamicUser } = useDynamicContext();
  const navigate = useNavigate();
  const location = useLocation();
  const dynamicLoginInFlightRef = useRef(false);
  const processedDynamicTokenRef = useRef(null);

  useEffect(() => {
    if (!dynamicUser || authUser || authLoading || dynamicLoginInFlightRef.current) return;

    const dynamicJwt = getAuthToken();
    if (!dynamicJwt || processedDynamicTokenRef.current === dynamicJwt) return;

    processedDynamicTokenRef.current = dynamicJwt;
    dynamicLoginInFlightRef.current = true;

    loginWithDynamic(dynamicJwt)
      .then((result) => {
        if (!result.success) {
          console.error('Dynamic login exchange failed:', result.error);
          return;
        }

        const storedOrigin = sessionStorage.getItem('auth_origin');
        const origin = storedOrigin && storedOrigin.startsWith('/') && !storedOrigin.startsWith('//')
          ? storedOrigin
          : '/dashboard';
        const completedOnboarding = Boolean(result.user?.onboardingComplete || result.user?.onboarding_complete);
        const target = completedOnboarding ? (origin === '/' ? '/dashboard' : origin) : '/onboarding';

        setShowWalletModal(false);
        navigate(target, { replace: true });
      })
      .catch((err) => {
        console.error('Dynamic login exchange failed:', err);
      })
      .finally(() => {
        sessionStorage.removeItem('auth_origin');
        dynamicLoginInFlightRef.current = false;
      });
  }, [dynamicUser, authUser, authLoading, loginWithDynamic, navigate, setShowWalletModal]);

  const handleGetStarted = () => {
    if (role === 'guest') {
      setShowWalletModal(true);
    } else {
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

      {/* Standard App Navbar */}
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-surface-950/80 backdrop-blur-sm animate-fade-in">
                  <div className="w-full max-w-2xl bg-surface-900 border border-white/10 rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] md:max-h-[85vh] animate-slide-up">
                    <div className="px-6 py-4 md:px-10 md:py-6 border-b border-white/5 bg-surface-800/50">
                      <StepIndicator current={onboardingStep} />
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10">
                      <div className="mx-auto w-full">
                        {onboardingStep === 0 && <RoleSelection onComplete={nextStep} />}
                        {onboardingStep === 1 && <CategorySelection onComplete={nextStep} onBack={prevStep} />}
                        {onboardingStep === 2 && <DomainRegistration onComplete={nextStep} onBack={prevStep} />}
                        {onboardingStep === 3 && <SocialLinking onComplete={nextStep} onBack={prevStep} />}
                        {onboardingStep === 4 && <ProfileEditor onComplete={nextStep} onBack={prevStep} />}
                        {onboardingStep === 5 && <OnboardingComplete onFinish={finishOnboarding} onBack={prevStep} />}
                      </div>
                    </div>
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

            <Route path="/auth/callback" element={<AuthCallbackHandler />} />
            <Route path="/auth/callback/:platform" element={<AuthCallbackHandler />} />
            <Route path="/auth/complete" element={<AuthCompletion />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/checkout/:wallet" element={<CheckoutPage />} />
            <Route path="/:username" element={<CreatorPage />} />

            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

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
  const { user, loading } = useAuth();
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

  if (!user?.email || user?.email?.endsWith('@phantom.local') || !user?.emailVerifiedAt || !user?.name) {
    return <Navigate to="/auth/complete" state={{ from: location }} replace />;
  }

  if (requiredRole === 'creator') {
    // Allow both creators AND authenticated users who are onboarding to access the dashboard container.
    // They will be limited via UI blurring inside the Dashboard component itself.
    if (role === 'creator' || role === 'user') {
      return children;
    }
    return <Navigate to="/" replace />;
  }


  return children;
}

function AuthCallbackHandler() {
  const { platform } = useParams();
  const navigate = useNavigate();
  const { updateProfile } = useApp();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const errorParam = params.get('error');

    if (!platform && code) {
       const finalize = async () => {
          try {
            const res = await api.post('/auth/exchange', { code });
            if (res.ok && res.data.success) {
               if (window.opener) {
                 window.opener.postMessage({ 
                   type: 'AUTH_SUCCESS', 
                   accessToken: res.data.auth.accessToken,
                   user: res.data.user
                 }, window.location.origin);
                 setTimeout(() => window.close(), 500);
               } else {
                 window.location.href = '/dashboard';
               }
            } else {
               throw new Error(res.data.error || 'Exchange failed');
            }
          } catch (err) {
            setError(err.message);
            setStatus('error');
            if (window.opener) {
               window.opener.postMessage({ type: 'AUTH_ERROR', error: err.message }, window.location.origin);
            }
          }
       };
       finalize();
       return;
    }

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

    if (code && platform) {
      const exchangeCode = async () => {
        try {
          // ─── ELITE SECURITY: CSRF PROTECTION ───
          const returnedState = params.get('state');
          const storedState = sessionStorage.getItem(`oauth_state_${platform}`);
          
          if (!returnedState || returnedState !== storedState) {
            console.error('🛡️ OAuth Security Alert: State mismatch detected. Potential CSRF attack.');
            throw new Error('Security verification failed. Please try again.');
          }

          const codeVerifier = sessionStorage.getItem(`pkce_verifier_${platform}`);
          const res = await api.post(`/auth/${platform}/callback`, {
            code,
            state: returnedState, // Pass state for backend verification
            redirectUri: `${window.location.origin}/auth/callback/${platform}`,
            codeVerifier
          });

          if (res.ok) {
            const data = res.data;
            const updates = {
              socials: {
                [platform === 'twitter' ? 'twitter' : 'discord']: data.username,
                [`is${platform.charAt(0).toUpperCase() + platform.slice(1)}Verified`]: true
              }
            };

            if (platform === 'twitter' && data.details) {
              updates.displayName = data.details.name;
              updates.bio = data.details.bio;
              updates.avatarUrl = data.details.avatar;
              updates.avatarType = 'social';
            }

            updateProfile(updates);
            setStatus('success');

            if (window.opener) {
              window.opener.postMessage({ 
                type: 'OAUTH_SUCCESS', 
                platform, 
                username: data.username,
                details: data.details
              }, window.location.origin);
              setTimeout(() => window.close(), 500);
            } else {
              navigate(`/onboarding?step=3&oauth_success=${platform}`);
            }
          } else {
            throw new Error(res.data?.message || 'Identity provider rejected the authorization code.');
          }
        } catch (err) {
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
    }
  }, [platform, navigate, updateProfile]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950">
      <div className="text-center animate-fade-in">
        {status === 'error' ? (
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
