import { useApp } from '../contexts/AppContext';
import { PartyPopper, ArrowRight } from 'lucide-react';

export default function OnboardingComplete({ onFinish }) {
  const { profile } = useApp();

  return (
    <div className="glass-card glow-brand p-10 max-w-lg mx-auto text-center">
      <div className="w-20 h-20 rounded-2xl bg-accent-green/20 flex items-center justify-center mx-auto mb-6">
        <PartyPopper size={36} className="text-accent-green" />
      </div>

      <h2 className="text-3xl font-bold mb-3">You're All Set</h2>
      <p className="text-surface-400 mb-8">
        Your Web3 creator profile is ready. Access your dashboard to receive tips and manage Kamino vault positions.
      </p>

      <div className="bg-surface-800/50 rounded-xl p-5 mb-8 space-y-3 text-left">
        <div className="flex justify-between">
          <span className="text-surface-500">Avatar</span>
          <span className="font-medium">{profile.nftAvatar?.name || 'Default'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-surface-500">Domain</span>
          <span className="font-medium">{profile.solDomain || 'Not registered'}</span>
        </div>
        {profile.nftAvatar?.isDoodle && (
          <div className="flex justify-between">
            <span className="text-surface-500">Status</span>
            <span className="text-accent-orange font-semibold">★ Doodles Holder</span>
          </div>
        )}
      </div>

      <button onClick={onFinish} className="btn-primary flex items-center gap-2 mx-auto">
        Go to Dashboard
        <ArrowRight size={16} />
      </button>
    </div>
  );
}
