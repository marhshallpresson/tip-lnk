import { Check } from 'lucide-react';

const STEPS = ['Connect Wallet', 'Select NFT Avatar', 'Register .sol Domain', 'Complete'];

export default function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-10">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                  done
                    ? 'bg-accent-green text-surface-950'
                    : active
                    ? 'bg-brand-600 text-white ring-4 ring-brand-600/25'
                    : 'bg-surface-800 text-surface-500'
                }`}
              >
                {done ? <Check size={16} strokeWidth={3} /> : i + 1}
              </div>
              <span
                className={`text-xs font-medium whitespace-nowrap ${
                  done ? 'text-accent-green' : active ? 'text-brand-400' : 'text-surface-600'
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`w-12 h-0.5 mb-5 ${done ? 'bg-accent-green' : 'bg-surface-800'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
