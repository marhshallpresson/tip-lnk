import { useWallet } from '@solana/wallet-adapter-react';
import { SolanaWalletProvider } from './contexts/WalletContext';
import { AppProvider, useApp } from './contexts/AppContext';
import StepIndicator from './components/StepIndicator';
import DomainRegistration from './components/DomainRegistration';
import SocialLinking from './components/SocialLinking';
import OnboardingComplete from './components/OnboardingComplete';
import WalletModal from './components/WalletModal';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import AppNavbar from './components/AppNavbar';
import RequireAuth from './components/RequireAuth';
import CreatorPage from './components/CreatorPage';
import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';

// Lazy load components for performance
const OverviewTab = lazy(() => import('./components/Dashboard').then(m => ({ default: m.OverviewTab })));
const TransactionHistoryTab = lazy(() => import('./components/Dashboard').then(m => ({ default: m.TransactionHistoryTab })));

const TermsOfService = lazy(() => import('./components/legal/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./components/legal/PrivacyPolicy'));


function AppContent() {
  const { role, onboardingStep, update } = useApp();
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleGetStarted = () => {
    if (role === 'creator') {
      navigate('/dashboard');
    } else if (role === 'user') {
      navigate('/onboarding');
    } else {
      setIsWalletModalOpen(true);
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
      <AppNavbar 
        onGetStarted={handleGetStarted}
        onboardingComplete={role === 'creator'}
        connected={role !== 'guest'}
        onViewDashboard={() => navigate('/dashboard')}
        onViewProfile={() => navigate('/')}
        isDashboard={location.pathname.startsWith('/dashboard')}
      />

      <main className="flex-1">
        <Routes>
          <Route path="/" element={
            <>
              <LandingPage onGetStarted={handleGetStarted} />
              <WalletModal 
                isOpen={isWalletModalOpen} 
                onClose={() => setIsWalletModalOpen(false)} 
                onConnected={() => navigate('/dashboard')}
              />
            </>
          } />

          <Route path="/onboarding" element={
            <RequireAuth requiredRole="user">
              <div className="min-h-[calc(100vh-80px)] mt-20 flex flex-col items-center justify-center p-6">
                <StepIndicator current={onboardingStep} />
                <div className="w-full max-w-3xl">
                  {onboardingStep === 0 && <DomainRegistration onComplete={nextStep} onBack={prevStep} />}
                  {onboardingStep === 1 && <SocialLinking onComplete={nextStep} onBack={prevStep} />}
                  {onboardingStep === 2 && <OnboardingComplete onFinish={finishOnboarding} />}
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

/**
 * Real-world OAuth2 Callback Handler
 * Acts as the landing zone for official X/Discord validation.
 */
function AuthCallbackHandler() {
  const { platform } = useParams();
  const navigate = useNavigate();
  const { updateProfile } = useApp();
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code) {
      const exchangeCode = async () => {
        try {
          const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.eitherway.ai';
          const response = await fetch(`${API_BASE}/api/auth/${platform}/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, redirectUri: `${window.location.origin}/auth/callback/${platform}` })
          });
          
          if (!response.ok) throw new Error('Identity provider rejected the authorization code.');
          const data = await response.json();
          
          // Update profile with real verified social data
          updateProfile({
            socials: {
              [platform]: data.username,
              [`is${platform.charAt(0).toUpperCase() + platform.slice(1)}Verified`]: true
            }
          });

          // If in a popup, message the opener and close
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_SUCCESS', platform }, window.location.origin);
            window.close();
          } else {
            navigate(`/onboarding?step=1&oauth_success=${platform}`);
          }
        } catch (err) {
          console.error('OAuth Exchange Error:', err);
          setError(err.message);
          if (!window.opener) {
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
        {error ? (
          <div className="text-accent-red">
            <h2 className="text-2xl font-bold">Verification Failed</h2>
            <p className="mt-2">{error}</p>
            <p className="text-surface-500 text-sm mt-4 italic">Redirecting back...</p>
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
      <AppProvider>
        <div className="min-h-screen bg-surface-950 text-white">
          <AppContent />
        </div>
      </AppProvider>
    </SolanaWalletProvider>
  );
}
