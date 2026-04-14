import { useWallet } from '@solana/wallet-adapter-react';
import { SolanaWalletProvider } from './contexts/WalletContext';
import { AppProvider, useApp } from './contexts/AppContext';
import StepIndicator from './components/StepIndicator';
import WalletConnect from './components/WalletConnect';
import NFTProfilePicker from './components/NFTProfilePicker';
import DomainRegistration from './components/DomainRegistration';
import SocialLinking from './components/SocialLinking';
import OnboardingComplete from './components/OnboardingComplete';
import WalletModal from './components/WalletModal';
import { Sparkles } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';


function AppContent() {
  const { onboardingStep, onboardingComplete, update, isDemo } = useApp();
  const { connected } = useWallet();
  const [view, setView] = useState('landing');
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  useEffect(() => {
    if (onboardingComplete && connected) {
      setView('dashboard');
    }
  }, [onboardingComplete, connected]);

  const nextStep = useCallback(() => {
    update({ onboardingStep: onboardingStep + 1 });
    setView('onboarding');
  }, [onboardingStep, update]);

  const finishOnboarding = useCallback(() => {
    update({ onboardingComplete: true });
    setView('dashboard');
  }, [update]);

  const handleGetStarted = () => {
    if (onboardingComplete && (connected || isDemo)) {
      setView('dashboard');
    } else if (connected || isDemo) {
      setView('onboarding');
    } else {
      setIsWalletModalOpen(true);
    }
  };

  if (view === 'landing') {
    return (
      <>
        <LandingPage 
          onGetStarted={handleGetStarted} 
          onboardingComplete={onboardingComplete}
          connected={connected || isDemo}
          onViewDashboard={() => setView('dashboard')}
        />
        <WalletModal 
          isOpen={isWalletModalOpen} 
          onClose={() => setIsWalletModalOpen(false)} 
          onConnected={nextStep}
        />
      </>
    );
  }


  if (view === 'dashboard' || (onboardingComplete && (connected || isDemo))) {
    return <Dashboard />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface-950">
      <div className="mb-0 absolute top-8 left-8">
        <button onClick={() => setView('landing')} className="flex items-center gap-2 text-surface-400 hover:text-[#c4ff00] transition-colors">
          <Sparkles size={18} />
          <span className="font-bold tracking-tight">TipLnk</span>
        </button>
      </div>

      <StepIndicator current={onboardingStep} />

      <div className="w-full max-w-3xl">
        {onboardingStep === 0 && (
          <div className="glass-card p-10 text-center animate-slide-up">
            <h2 className="text-2xl font-bold mb-4">Connect Wallet</h2>
            <p className="text-surface-400 mb-8">Please connect your wallet to continue setting up your creator profile.</p>
            <button 
              onClick={() => setIsWalletModalOpen(true)}
              className="btn-primary"
            >
              Open Wallet Portal
            </button>
            <WalletModal 
              isOpen={isWalletModalOpen} 
              onClose={() => setIsWalletModalOpen(false)} 
              onConnected={nextStep}
            />
          </div>
        )}
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
