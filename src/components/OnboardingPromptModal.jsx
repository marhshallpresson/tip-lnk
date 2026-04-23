import { AlertCircle, ChevronRight, X } from 'lucide-react';

export default function OnboardingPromptModal({ onClose, onContinue }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="glass-card max-w-md w-full p-8 relative overflow-hidden shadow-2xl shadow-brand-500/10 border-brand-500/20">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-white/20 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center mb-6 border border-brand-500/20">
            <AlertCircle className="text-brand-500" size={32} />
          </div>
          
          <h3 className="text-2xl font-bold mb-3 tracking-tight">Finish Your Setup</h3>
          <p className="text-white/40 text-sm leading-relaxed mb-8">
            Complete your onboarding to claim your unique .tiplnk.sol handle and unlock real-time analytics.
          </p>

          <div className="space-y-3 w-full">
            <button 
              onClick={onContinue}
              className="btn-primary w-full py-4 flex items-center justify-center gap-2"
            >
              Complete Onboarding
              <ChevronRight size={18} />
            </button>
            <button 
              onClick={onClose}
              className="w-full py-3 text-xs font-bold uppercase tracking-widest text-white/20 hover:text-white transition-colors"
            >
              Explore First
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
