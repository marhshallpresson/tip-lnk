import { useApp } from '../contexts/AppContext';
import { 
  Gamepad2, 
  Palette, 
  Music, 
  GraduationCap, 
  Video, 
  PenTool, 
  Layout, 
  Type, 
  BarChart, 
  Users, 
  Laptop, 
  Hash,
  Globe, 
  Monitor, 
  Server, 
  Cpu, 
  FileJson, 
  ShieldAlert,
  ChevronRight, 
  ArrowLeft
} from 'lucide-react';

const CATEGORIES = {
  creator: [
    { id: 'gaming', title: 'Gaming', icon: Gamepad2 },
    { id: 'art', title: 'Art & Design', icon: Palette },
    { id: 'music', title: 'Music', icon: Music },
    { id: 'education', title: 'Education', icon: GraduationCap },
    { id: 'video', title: 'Content', icon: Video },
    { id: 'writing', title: 'Writing', icon: PenTool },
  ],
  freelancer: [
    { id: 'design', title: 'Design', icon: Layout },
    { id: 'copywriting', title: 'Copywriting', icon: Type },
    { id: 'marketing', title: 'Marketing', icon: BarChart },
    { id: 'consulting', title: 'Consulting', icon: Users },
    { id: 'va', title: 'Virtual Assistant', icon: Laptop },
    { id: 'translation', title: 'Translation', icon: Hash },
  ],
  developer: [
    { id: 'fullstack', title: 'Fullstack', icon: Globe },
    { id: 'frontend', title: 'Frontend', icon: Monitor },
    { id: 'backend', title: 'Backend', icon: Server },
    { id: 'ai', title: 'AI / ML', icon: Cpu },
    { id: 'web3', title: 'Smart Contracts', icon: FileJson },
    { id: 'security', title: 'Security', icon: ShieldAlert },
  ]
};

export default function CategorySelection({ onComplete, onBack }) {
  const { profile, updateProfile } = useApp();
  const role = profile.roleTier || 'creator';
  const rolesCategories = CATEGORIES[role] || CATEGORIES.creator;

  const handleSelect = (categoryId) => {
    updateProfile({ category: categoryId });
    onComplete();
  };

  return (
    <div className="glass-card glow-brand p-10 max-w-3xl mx-auto animate-slide-up">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-surface-800 text-surface-400 hover:text-white transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-3xl font-black">Tell us more...</h2>
          <p className="text-surface-400">What's your primary niche as a {role}?</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {rolesCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleSelect(cat.id)}
            className={`flex flex-col items-center justify-center gap-4 p-6 rounded-2xl border border-surface-700 bg-surface-800/40 hover:bg-surface-800 hover:border-brand-500/50 transition-all group`}
          >
            <div className="w-12 h-12 rounded-xl bg-surface-700 flex items-center justify-center group-hover:bg-brand-500/20 transition-colors">
              <cat.icon size={24} className="text-surface-400 group-hover:text-brand-400" />
            </div>
            <span className="font-bold text-sm text-surface-200 group-hover:text-white transition-colors">{cat.title}</span>
          </button>
        ))}
      </div>

      <div className="mt-10 flex justify-between items-center text-xs text-surface-500">
        <p>This helps us recommend the best tools for your niche.</p>
        <button onClick={onComplete} className="hover:text-brand-400 font-bold uppercase tracking-widest transition-colors">
          Skip <ChevronRight size={12} className="inline ml-1" />
        </button>
      </div>
    </div>
  );
}
