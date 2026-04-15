import { useState, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { Upload, User, Check, RefreshCw, ChevronRight, Camera, ChevronLeft } from 'lucide-react';

export default function ProfileEditor({ onComplete, onBack }) {
  const { profile, updateProfile } = useApp();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        updateProfile({
          avatarUrl: reader.result,
          avatarType: 'uploaded'
        });
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current.click();
  };

  const getSourceLabel = () => {
    switch(profile.avatarType) {
      case 'social': return 'Imported from X';
      case 'uploaded': return 'Custom Upload';
      case 'nft': return 'Solana NFT';
      default: return 'Default Avatar';
    }
  };

  return (
    <div className="glass-card glow-brand p-10 max-w-2xl mx-auto animate-slide-up">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-surface-800 text-surface-400 hover:text-white transition-all"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-left">
          <h2 className="text-3xl font-bold">Identity Protocol</h2>
          <p className="text-surface-400 text-sm">
            Customize your on-chain creator identity.
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-6 mb-10">
        <div className="relative group">
          <div className="w-40 h-40 rounded-3xl overflow-hidden ring-4 ring-brand-500/30 bg-surface-800 shadow-2xl relative">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User size={64} className="text-surface-600" />
              </div>
            )}
            
            {isUploading && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                <RefreshCw size={32} className="text-brand-400 animate-spin" />
              </div>
            )}
          </div>
          
          <button 
            onClick={triggerUpload}
            className="absolute -bottom-3 -right-3 w-12 h-12 rounded-2xl bg-brand-500 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
          >
            <Upload size={20} />
          </button>
        </div>

        <div className="text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-400 bg-brand-500/10 px-3 py-1 rounded-full border border-brand-500/20">
            {getSourceLabel()}
          </span>
          <p className="text-surface-500 text-sm mt-3">Click the upload icon to change your picture</p>
        </div>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept="image/*"
        />
      </div>

      <div className="flex justify-between items-center pt-6 border-t border-surface-800">
        <p className="text-xs text-surface-500 italic max-w-xs">
          High-quality avatars build more trust with your community.
        </p>
        <button 
          onClick={onComplete}
          className="btn-primary flex items-center gap-2 group"
        >
          Looks Great <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
