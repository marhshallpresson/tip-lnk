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
    <div className="animate-fade-in">
      <div className="mb-8">
        <h2 className="text-2xl md:text-3xl font-black mb-2 tracking-tight">Setup your profile</h2>
        <p className="text-white/40 text-sm md:text-base">
          Tell us how you'll use TipLnk to customize your experience.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-8">
        {roles.map((role) => (
          <button
            key={role.id}
            onClick={() => handleRoleSelect(role.id)}
            className={`flex flex-col items-start p-5 rounded-2xl border transition-all text-left ${selectedRoleId === role.id
                ? 'border-brand-500 bg-brand-500/10 ring-1 ring-brand-500/20'
                : 'border-white/5 bg-white/5 hover:border-white/10 opacity-60 hover:opacity-100'
              }`}
          >
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center mb-4 transition-transform ${selectedRoleId === role.id ? 'bg-brand-500 text-black' : 'bg-white/5 text-white/40'}`}>
              <role.icon size={20} />
            </div>
            <h3 className={`text-base md:text-lg font-bold mb-1 ${selectedRoleId === role.id ? 'text-white' : 'text-white/40'}`}>{role.title}</h3>
            <p className="text-xs text-white/30 leading-relaxed">
              {role.description}
            </p>
          </button>
        ))}
      </div>

      {selectedRoleId && (
        <div className="animate-slide-up">
          <div className="h-px bg-white/5 mb-8" />

          <div className="mb-6">
            <h3 className="text-lg md:text-xl font-bold mb-1 text-white">Which platforms do you use?</h3>
            <p className="text-white/30 text-xs">Select all that apply.</p>
          </div>

          <div className="flex flex-wrap gap-2 mb-8">
            {currentPlatforms.map((platform) => {
              const isSelected = selectedPlatforms.includes(platform.id);
              return (
                <button
                  key={platform.id}
                  onClick={() => togglePlatform(platform.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${isSelected
                      ? 'bg-brand-500 text-black border-brand-500 font-bold'
                      : 'border-white/10 bg-white/5 text-white/40 hover:border-white/20 hover:text-white'
                    }`}
                >
                  <platform.icon size={14} />
                  <span className="text-xs md:text-sm">{platform.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-6 border-t border-white/5">
            <button
              onClick={handleContinue}
              className="btn-primary w-full py-4 rounded-2xl text-lg group"
            >
              Continue <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
