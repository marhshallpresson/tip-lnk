import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { User, Briefcase, Code, ChevronRight, ChevronLeft, Edit, Check, Youtube, Instagram, Github, Laptop, MessageSquare, Twitter, FastForward } from 'lucide-react';

const ROLE_PLATFORMS = {
  creator: [
    { id: 'x', label: 'X (Twitter)', icon: Twitter },
    { id: 'youtube', label: 'YouTube', icon: Youtube },
    { id: 'instagram', label: 'Instagram', icon: Instagram },
    { id: 'twitch', label: 'Twitch', icon: MessageSquare },
    { id: 'tiktok', label: 'TikTok', icon: Laptop },
  ],
  freelancer: [
    { id: 'x', label: 'X (Twitter)', icon: Twitter },
    { id: 'linkedin', label: 'LinkedIn', icon: Briefcase },
    { id: 'behance', label: 'Behance', icon: Edit },
    { id: 'dribbble', label: 'Dribbble', icon: User },
    { id: 'upwork', label: 'Upwork', icon: Briefcase },
  ],
  developer: [
    { id: 'github', label: 'GitHub', icon: Github },
    { id: 'x', label: 'X (Twitter)', icon: Twitter },
    { id: 'stackoverflow', label: 'Stack Overflow', icon: Code },
    { id: 'discord', label: 'Discord', icon: MessageSquare },
    { id: 'devto', label: 'Dev.to', icon: Laptop },
  ]
};

export default function RoleSelection({ onComplete }) {
  const { updateProfile, profile } = useApp();
  const [selectedRoleId, setSelectedRoleId] = useState(profile.roleTier || 'creator');
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);

  const roles = [
    {
      id: 'creator',
      title: 'Individual Creator',
      description: 'Streamers, Artists, and Content Creators.',
      icon: Edit,
      color: 'text-brand-500',
    },
    {
      id: 'freelancer',
      title: 'Freelancer',
      description: 'Designers, Writers, and Service Providers.',
      icon: Briefcase,
      color: 'text-accent-cyan',
    },
    {
      id: 'developer',
      title: 'Developer',
      description: 'Engineers, Tinkers, and Open Source Contributors.',
      icon: Code,
      color: 'text-accent-purple',
    }
  ];

  const handleRoleSelect = (roleId) => {
    setSelectedRoleId(roleId);
    setSelectedPlatforms([]);
  };

  const togglePlatform = (platformId) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    );
  };

  const handleContinue = () => {
    const role = roles.find(r => r.id === selectedRoleId);
    updateProfile({
      roleTier: selectedRoleId,
      roleTitle: role.title,
      platforms: selectedPlatforms,
      auto_convert_usdc: true
    });
    onComplete();
  };

  const currentPlatforms = selectedRoleId ? ROLE_PLATFORMS[selectedRoleId] : [];

  return (
    <div className="glass-card p-6 md:p-10 max-w-3xl mx-auto animate-slide-up">
      <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
        <div className="text-center md:text-left flex-1">
          <h2 className="text-3xl md:text-4xl font-black mb-2 tracking-tight">Setup your profile</h2>
          <p className="text-white/40 text-sm md:text-base">
            Tell us how you'll use TipLnk to customize your experience.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 md:mb-12">
        {roles.map((role) => (
          <button
            key={role.id}
            onClick={() => handleRoleSelect(role.id)}
            className={`flex flex-col items-center text-center p-5 md:p-6 rounded-2xl border transition-all ${selectedRoleId === role.id
                ? 'border-brand-500 bg-brand-500/5 ring-1 ring-brand-500/20'
                : 'border-white/5 bg-white/5 hover:border-white/10 opacity-60 hover:opacity-100'
              }`}
          >
            <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl flex items-center justify-center mb-4 transition-transform ${selectedRoleId === role.id ? 'scale-110' : ''}`}>
              <role.icon size={selectedRoleId === role.id ? 32 : 28} className={selectedRoleId === role.id ? role.color : 'text-white/40'} />
            </div>
            <h3 className={`text-sm md:text-lg font-bold mb-1 ${selectedRoleId === role.id ? 'text-white' : 'text-white/40'}`}>{role.title}</h3>
            <p className="text-[10px] md:text-xs text-white/30 leading-relaxed">
              {role.description}
            </p>
          </button>
        ))}
      </div>

      {selectedRoleId && (
        <div className="animate-fade-in">
          <div className="h-px bg-white/5 mb-10" />

          <div className="text-center mb-8">
            <h3 className="text-xl md:text-2xl font-bold mb-2 text-white">Which platforms do you use?</h3>
            <p className="text-white/30 text-xs md:text-sm">Multi-selection: Select all that apply.</p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-10">
            {currentPlatforms.map((platform) => {
              const isSelected = selectedPlatforms.includes(platform.id);
              return (
                <button
                  key={platform.id}
                  onClick={() => togglePlatform(platform.id)}
                  className={`flex items-center gap-2 md:gap-3 px-4 md:px-6 py-2 md:py-3 rounded-xl border transition-all ${isSelected
                      ? 'bg-white text-black border-white font-bold'
                      : 'border-white/10 bg-white/5 text-white/40 hover:border-white/20 hover:text-white'
                    }`}
                >
                  <platform.icon size={16} />
                  <span className="text-xs md:text-sm">{platform.label}</span>
                  {isSelected && <Check size={12} className="ml-1" />}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4 pt-6 border-t border-white/5">
            <button
              onClick={handleContinue}
              className="btn-primary w-full md:w-auto md:px-12 py-4"
            >
              Confirm Selection <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
