import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { User, Briefcase, Code, ChevronRight, ChevronLeft, Edit, Check, Youtube, Instagram, Github, Laptop, MessageSquare, Twitter } from 'lucide-react';

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
  const [selectedRoleId, setSelectedRoleId] = useState(profile.roleTier || null);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);

  const roles = [
    {
      id: 'creator',
      title: 'Creator',
      description: 'Streamers, Artists, Influencers, and Content Creators.',
      icon: Edit,
      color: 'text-[#00d265]',
      bgColor: 'bg-[#00d265]/10',
      borderColor: 'border-[#00d265]/20'
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

  const handleRoleSelect = (roleId) => {
    setSelectedRoleId(roleId);
    setSelectedPlatforms([]); // Reset platforms when role changes
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
      platforms: selectedPlatforms
    });
    onComplete();
  };

  const currentPlatforms = selectedRoleId ? ROLE_PLATFORMS[selectedRoleId] : [];

  return (
    <div className="glass-card glow-brand p-10 max-w-3xl mx-auto animate-slide-up">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => window.history.back()}
          className="p-2 rounded-xl hover:bg-surface-800 text-surface-400 hover:text-white transition-all"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center flex-1 pr-10">
          <h2 className="text-4xl font-black mb-4">What describes you best?</h2>
          <p className="text-surface-400 text-lg">
            We'll customize your TipLnk experience based on how you plan to use the platform.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {roles.map((role) => (
          <button
            key={role.id}
            onClick={() => handleRoleSelect(role.id)}
            className={`flex flex-col items-center text-center p-6 rounded-3xl border transition-all group ${selectedRoleId === role.id
                ? `${role.borderColor} ${role.bgColor} ring-2 ring-brand-500/20 scale-[1.02]`
                : 'border-surface-800 bg-surface-950/20 grayscale opacity-60 hover:grayscale-0 hover:opacity-100'
              }`}
          >
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${selectedRoleId === role.id ? 'rotate-6' : 'group-hover:rotate-6'} transition-transform`}>
              <role.icon size={32} className={selectedRoleId === role.id ? role.color : 'text-surface-500'} />
            </div>
            <h3 className={`text-xl font-bold mb-2 ${selectedRoleId === role.id ? 'text-white' : 'text-surface-500'}`}>{role.title}</h3>
            <p className="text-xs text-surface-400 leading-relaxed">
              {role.description}
            </p>
          </button>
        ))}
      </div>

      {selectedRoleId && (
        <div className="animate-fade-in">
          <div className="h-px bg-surface-800 mb-10" />

          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold mb-2">Which platforms do you use?</h3>
            <p className="text-surface-500 text-sm italic">Multi-selection: Select all that apply to your {selectedRoleId} workflow.</p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {currentPlatforms.map((platform) => {
              const isSelected = selectedPlatforms.includes(platform.id);
              return (
                <button
                  key={platform.id}
                  onClick={() => togglePlatform(platform.id)}
                  className={`flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all ${isSelected
                      ? 'bg-brand-500 border-brand-500 text-black shadow-lg shadow-brand-500/20 font-bold'
                      : 'border-surface-800 bg-surface-900 text-surface-400 hover:border-surface-700 hover:text-white'
                    }`}
                >
                  <platform.icon size={18} />
                  <span className="text-sm">{platform.label}</span>
                  {isSelected && <Check size={14} className="ml-1" />}
                </button>
              );
            })}
          </div>

          <div className="flex justify-center pt-6 border-t border-surface-800">
            <button
              onClick={handleContinue}
              className="btn-primary flex items-center gap-3 !px-12 !py-4 group shadow-2xl shadow-brand-500/20"
            >
              Continue to Niche <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {!selectedRoleId && (
        <div className="mt-12 text-center">
          <p className="text-xs text-surface-600 italic">
            Select a role above to reveal platform options.
          </p>
        </div>
      )}
    </div>
  );
}
