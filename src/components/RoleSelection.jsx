import { useApp } from '../contexts/AppContext';
import { User, Briefcase, Code, ChevronRight, Zap } from 'lucide-react';

export default function RoleSelection({ onComplete }) {
  const { updateProfile } = useApp();

  const roles = [
    {
      id: 'creator',
      title: 'Creator',
      description: 'Streamers, Artists, Influencers, and Content Creators.',
      icon: Zap,
      color: 'text-[#c4ff00]',
      bgColor: 'bg-[#c4ff00]/10',
      borderColor: 'border-[#c4ff00]/20'
    },
    {
      id: 'freelancer',
      title: 'Freelancer',
      description: 'Designers, Writers, and Service Providers.',
      icon: Briefcase,
      color: 'text-accent-cyan',
      bgColor: 'bg-accent-cyan/10',
      borderColor: 'border-accent-cyan/20'
    },
    {
      id: 'developer',
      title: 'Developer',
      description: 'Engineers, Tinkers, and Open Source Contributors.',
      icon: Code,
      color: 'text-accent-purple',
      bgColor: 'bg-accent-purple/10',
      borderColor: 'border-accent-purple/20'
    }
  ];

  const handleSelect = (roleId) => {
    updateProfile({ roleTier: roleId });
    onComplete();
  };

  return (
    <div className="glass-card glow-brand p-10 max-w-3xl mx-auto animate-slide-up">
      <div className="text-center mb-10">
        <h2 className="text-4xl font-black mb-4">What describes you best?</h2>
        <p className="text-surface-400 text-lg">
          We'll customize your TipLnk experience based on how you plan to use the platform.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {roles.map((role) => (
          <button
            key={role.id}
            onClick={() => handleSelect(role.id)}
            className={`flex flex-col items-center text-center p-8 rounded-3xl border ${role.borderColor} ${role.bgColor} hover:scale-105 transition-all group`}
          >
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform`}>
              <role.icon size={32} className={role.color} />
            </div>
            <h3 className="text-xl font-bold mb-2">{role.title}</h3>
            <p className="text-sm text-surface-400 leading-relaxed">
              {role.description}
            </p>
            <div className={`mt-6 p-2 rounded-full ${role.borderColor} border opacity-0 group-hover:opacity-100 transition-opacity`}>
              <ChevronRight size={16} className={role.color} />
            </div>
          </button>
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-xs text-surface-600">
          TipLnk is non-custodial and open to everyone. You can change your focus later in settings.
        </p>
      </div>
    </div>
  );
}
