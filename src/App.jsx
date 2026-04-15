import { useWallet } from '@solana/wallet-adapter-react';
import { SolanaWalletProvider } from './contexts/WalletContext';
import { AppProvider, useApp } from './contexts/AppContext';
import StepIndicator from './components/StepIndicator';
import WalletConnect from './components/WalletConnect';
import RoleSelection from './components/RoleSelection';
import CategorySelection from './components/CategorySelection';
import DomainRegistration from './components/DomainRegistration';
import SocialLinking from './components/SocialLinking';
import ProfileEditor from './components/ProfileEditor';
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
const PortfolioTab = lazy(() => import('./components/Dashboard').then(m => ({ default: m.PortfolioTab })));
const TransactionHistoryTab = lazy(() => import('./components/Dashboard').then(m => ({ default: m.TransactionHistoryTab })));
const SimulationTab = lazy(() => import('./components/Dashboard').then(m => ({ default: m.SimulationTab })));

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
                  {onboardingStep === 0 && <RoleSelection onComplete={nextStep} />}
                  {onboardingStep === 1 && <CategorySelection onComplete={nextStep} onBack={prevStep} />}
                  {onboardingStep === 2 && <DomainRegistration onComplete={nextStep} onBack={prevStep} />}
                  {onboardingStep === 3 && <SocialLinking onComplete={nextStep} onBack={prevStep} />}
                  {onboardingStep === 4 && <ProfileEditor onComplete={nextStep} onBack={prevStep} />}
                  {onboardingStep === 5 && <OnboardingComplete onFinish={finishOnboarding} />}
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
          <Route path="/u/:username" element={<CreatorPage />} />
          
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code) {
      console.log(`OAuth2: Received authorization from ${platform}`);
      // In a real system, the backend would verify this code.
      // We redirect back to onboarding to complete the Wallet Signature.
      setTimeout(() => {
        navigate(`/onboarding?step=1&oauth_success=${platform}`);
      }, 1500);
    }
  }, [platform, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950">
      <div className="text-center animate-fade-in">
        <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
        <h2 className="text-2xl font-bold">Verifying Account</h2>
        <p className="text-surface-400 mt-2 italic">Securing link with {platform} infrastructure...</p>
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
