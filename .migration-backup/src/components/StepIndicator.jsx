const STEPS = ['Role', 'Niche', 'URL', 'Socials', 'Profile', 'Done'];

export default function StepIndicator({ current }) {
  const progress = ((current) / (STEPS.length - 1)) * 100;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold mb-1">
            Step {current + 1} of {STEPS.length}
          </span>
          <h3 className="text-lg font-bold text-white tracking-tight">
            {STEPS[current]}
          </h3>
        </div>
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i <= current 
                  ? 'w-6 bg-brand-500' 
                  : 'w-1.5 bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>
      
      {/* Progress Bar Background */}
      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <div 
          className="h-full bg-brand-500 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(159,53,232,0.5)]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
