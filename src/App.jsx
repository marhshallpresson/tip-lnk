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
import AppNavbar from './components/AppNavbar';
import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';

// Lazy load components for performance
const OverviewTab = lazy(() => import('./components/Dashboard').then(m => ({ default: m.OverviewTab })));
const TransactionHistoryTab = lazy(() => import('./components/Dashboard').then(m => ({ default: m.TransactionHistoryTab })));

const TermsOfService = lazy(() => import('./components/legal/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./components/legal/PrivacyPolicy'));


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
    if (role === 'creator') {
      navigate('/dashboard');
    } else if (role === 'user') {
      navigate('/onboarding');
    } else {
      setShowWalletModal(true);
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
    navigate('/dashboard');
  }, [update, navigate]);

  return (
    <div className="min-h-screen bg-surface-950 text-white flex flex-col">
      <ScrollToTop />
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
        <Routes>
          <Route path="/" element={
            <>
              <LandingPage onGetStarted={handleGetStarted} />
              <WalletModal
                isOpen={showWalletModal}
                onClose={() => setShowWalletModal(false)}
                onConnected={(addr, isAuth) => {
                  if (addr || isAuth) navigate('/dashboard');
                }}
              />
            </>
          } />

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

          <Route path="/auth/callback/:platform" element={<AuthCallbackHandler />} />
          <Route path="/:username" element={<CreatorPage />} />

          <Route path="/terms" element={
            <Suspense fallback={<div className="min-h-screen bg-[#0d1117]" />}>
              <TermsOfService />
            </Suspense>
          } />

          <Route path="/privacy" element={
            <Suspense fallback={<div className="min-h-screen bg-[#0d1117]" />}>
              <PrivacyPolicy />
            </Suspense>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
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

  if (requiredRole === 'creator' && role === 'user') {
    return <Navigate to="/onboarding" replace />;
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const errorParam = params.get('error');

    // If OAuth provider returned an error
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

    if (code || params.get('publicKey')) {
      const exchangeCode = async () => {
        try {
          const isProd = import.meta.env.PROD;
          const API_BASE = isProd ? window.location.origin : (import.meta.env.VITE_API_BASE_URL);

          // Phantom Google specifically might return the publicKey directly in the URL
          const publicKey = params.get('publicKey');

          const response = await fetch(`${API_BASE}/api/auth/${platform}/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code,
              publicKey,
              redirectUri: `${window.location.origin}/auth/callback/${platform}`
            })
          });

          let data;
          if (response.ok) {
            data = await response.json();
          } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Identity provider rejected the authorization code.');
          }

          // Update profile with verified social data
          if (platform === 'phantom-google') {
            // This is a wallet connection success
            if (window.opener) {
              window.opener.postMessage({
                type: 'OAUTH_SUCCESS',
                platform: 'phantom-google',
                publicKey: data.walletAddress
              }, window.location.origin);
              setTimeout(() => window.close(), 500);
            }
            return;
          }

          updateProfile({
            socials: {
              [platform === 'twitter' ? 'twitter' : 'discord']: data.username,
              [`is${platform.charAt(0).toUpperCase() + platform.slice(1)}Verified`]: true
            }
          });

          setStatus('success');

          // If in a popup, message the opener and close
          if (window.opener) {
            window.opener.postMessage({
              type: 'OAUTH_SUCCESS',
              platform,
              username: data.username
            }, window.location.origin);
            setTimeout(() => window.close(), 500);
          } else {
            navigate(`/onboarding?step=1&oauth_success=${platform}`);
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
      // No code and no error param — something went wrong
      setError('No authorization code received.');
      setStatus('error');
      if (window.opener) {
        window.opener.postMessage({ type: 'OAUTH_ERROR', platform, error: 'No code received' }, window.location.origin);
        setTimeout(() => window.close(), 1500);
      }
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
