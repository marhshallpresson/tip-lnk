import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Zap, BarChart3, ShieldCheck, Landmark } from 'lucide-react';

const STEPS = [
  {
    title: "Welcome to TipLnk",
    description: "Your professional hub for Solana tips and creator growth. Let's get you settled in.",
    icon: <Zap className="text-brand-500" />,
    target: "stats-overview"
  },
  {
    title: "Real-time Analytics",
    description: "Track your earnings and supporters with live data powered by Birdeye. Watch your reach grow.",
    icon: <BarChart3 className="text-accent-cyan" />,
    target: "analytics-panel"
  },
  {
    title: "Yield Generation",
    description: "Your USDC tips don't just sit there. Kamino automatically earns you interest on your balance.",
    icon: <ShieldCheck className="text-emerald-500" />,
    target: "kamino-panel"
  },
  {
    title: "Easy Payouts",
    description: "Ready to cash out? Use Pajcash to send your earnings directly to your local bank account.",
    icon: <Landmark className="text-accent-orange" />,
    target: "payout-panel"
  }
];

export default function DashboardWalkthrough({ onComplete }) {
  const { onboardingComplete } = useApp();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show walkthrough if onboarding is truly complete
    if (!onboardingComplete) return;
    
    // Slight delay for impact after dashboard load
    const timer = setTimeout(() => setIsVisible(true), 1000);
    return () => clearTimeout(timer);
  }, [onboardingComplete]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    setTimeout(onComplete, 300);
  };

  if (!isVisible) return null;

  const step = STEPS[currentStep];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="glass-card max-w-md w-full p-8 relative overflow-hidden shadow-2xl shadow-brand-500/10 border-brand-500/20">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
          <div 
            className="h-full bg-brand-500 transition-all duration-500 ease-out"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <button 
          onClick={handleComplete}
          className="absolute top-4 right-4 p-2 text-white/20 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/10">
            {step.icon}
          </div>
          
          <h3 className="text-2xl font-bold mb-3 tracking-tight">{step.title}</h3>
          <p className="text-white/40 text-sm leading-relaxed mb-10">
            {step.description}
          </p>

          <div className="flex items-center justify-between w-full mt-4">
            <button 
              onClick={handleComplete}
              className="text-[10px] font-bold uppercase tracking-widest text-white/20 hover:text-white transition-colors"
            >
              Skip Tour
            </button>

            <div className="flex items-center gap-3">
              {currentStep > 0 && (
                <button 
                  onClick={handleBack}
                  className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              
              <button 
                onClick={handleNext}
                className="btn-primary !py-3 !px-6 flex items-center gap-2"
              >
                {currentStep === STEPS.length - 1 ? 'Get Started' : 'Next'}
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="flex gap-1.5 mt-8">
            {STEPS.map((_, i) => (
              <div 
                key={i} 
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentStep ? 'bg-brand-500 w-4' : 'bg-white/10'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
