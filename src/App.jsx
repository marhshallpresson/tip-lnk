import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { SolanaWalletProvider } from './contexts/WalletContext';
import { AppProvider, useApp } from './contexts/AppContext';
import StepIndicator from './components/StepIndicator';
import WalletConnect from './components/WalletConnect';
import NFTProfilePicker from './components/NFTProfilePicker';
import DomainRegistration from './components/DomainRegistration';
import OnboardingComplete from './components/OnboardingComplete';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import { Zap } from 'lucide-react';

function AppContent() {
  const { onboardingStep, onboardingComplete, update } = useApp();
  const { connected } = useWallet();
  const [showLanding, setShowLanding] = useState(true);

  const nextStep = useCallback(() => {
    update({ onboardingStep: onboardingStep + 1 });
  }, [onboardingStep, update]);

  const finishOnboarding = useCallback(() => {
    update({ onboardingComplete: true });
  }, [update]);

  const handleGetStarted = useCallback(() => {
    setShowLanding(false);
  }, []);

  // Show landing page first
  if (showLanding && !onboardingComplete) {
    return <LandingPage onGetStarted={handleGetStarted} />;
  }

  // Dashboard after onboarding
  if (onboardingComplete && connected) {
    return <Dashboard />;
  }

  // Onboarding flow
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative">
      {/* Subtle top gradient glow */}
      <div className="absolute inset-0 hero-bg-animated pointer-events-none" />

      <div className="mb-8 text-center relative z-10">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
            <Zap size={20} className="text-white" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">TipLnk</h1>
        </div>
        <p className="text-surface-400">Set up your creator tipping page on Solana</p>
      </div>

      <StepIndicator current={onboardingStep} />

      <div className="w-full max-w-3xl relative z-10">
        {onboardingStep === 0 && <WalletConnect onConnected={() => nextStep()} />}
        {onboardingStep === 1 && <NFTProfilePicker onComplete={() => nextStep()} />}
        {onboardingStep === 2 && <DomainRegistration onComplete={() => nextStep()} />}
        {onboardingStep === 3 && <OnboardingComplete onFinish={finishOnboarding} />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <SolanaWalletProvider>
      <AppProvider>
        <div className="min-h-screen bg-main-bg text-white">
          <AppContent />
        </div>
      </AppProvider>
    </SolanaWalletProvider>
  );
}
