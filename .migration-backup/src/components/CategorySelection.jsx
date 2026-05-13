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
    <div className="animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all border border-white/5"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">Tell us more...</h2>
          <p className="text-white/40 text-sm md:text-base">What's your primary niche as a {role}?</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {rolesCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleSelect(cat.id)}
            className={`flex flex-col items-start gap-4 p-5 md:p-6 rounded-2xl border border-white/5 bg-white/5 hover:bg-brand-500/10 hover:border-brand-500/50 transition-all group`}
          >
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-brand-500 group-hover:text-black transition-all">
              <cat.icon size={20} className="text-white/40 group-hover:text-inherit" />
            </div>
            <span className="font-bold text-sm md:text-base text-white/60 group-hover:text-white transition-colors">{cat.title}</span>
          </button>
        ))}
      </div>

      <div className="mt-10 pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-xs text-white/30 text-center md:text-left">This helps us recommend the best tools for your niche.</p>
        <button 
          onClick={onComplete} 
          className="text-white/40 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 group"
        >
          Skip for now <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
