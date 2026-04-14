import { useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { SolanaWalletProvider } from './contexts/WalletContext';
import { AppProvider, useApp } from './contexts/AppContext';
import StepIndicator from './components/StepIndicator';
import WalletConnect from './components/WalletConnect';
import NFTProfilePicker from './components/NFTProfilePicker';
import DomainRegistration from './components/DomainRegistration';
import SocialLinking from './components/SocialLinking';
import OnboardingComplete from './components/OnboardingComplete';
import Dashboard from './components/Dashboard';
import { Sparkles } from 'lucide-react';

function AppContent() {
  const { onboardingStep, onboardingComplete, update, isDemo } = useApp();
  const { connected } = useWallet();

  const nextStep = useCallback(() => {
    update({ onboardingStep: onboardingStep + 1 });
  }, [onboardingStep, update]);

  const finishOnboarding = useCallback(() => {
    update({ onboardingComplete: true });
  }, [update]);

  // If connected OR in demo mode, skip to dashboard if onboarding is complete/progressed
  if ((connected || isDemo) && (onboardingComplete || onboardingStep > 0)) {
    return <Dashboard />;
  }


  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Sparkles size={28} className="text-brand-400" />
          <h1 className="text-4xl font-extrabold tracking-tight">Creator Hub</h1>
        </div>
        <p className="text-surface-400">Web3 onboarding for creators on Solana</p>
      </div>

      <StepIndicator current={onboardingStep} />

      <div className="w-full max-w-3xl">
        {onboardingStep === 0 && <WalletConnect onConnected={() => nextStep()} />}
        {onboardingStep === 1 && <NFTProfilePicker onComplete={() => nextStep()} />}
        {onboardingStep === 2 && <DomainRegistration onComplete={() => nextStep()} />}
        {onboardingStep === 3 && <SocialLinking onComplete={() => nextStep()} />}
        {onboardingStep === 4 && <OnboardingComplete onFinish={finishOnboarding} />}
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
