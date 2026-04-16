import { useState, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { Upload, User, RefreshCw, ChevronRight, ChevronLeft, Pencil } from 'lucide-react';

export default function ProfileEditor({ onComplete, onBack }) {
  const { profile, updateProfile } = useApp();
  const [isUploading, setIsUploading] = useState(false);
  const [bio, setBio] = useState(profile.bio || '');
  const [roleTitle, setRoleTitle] = useState(profile.roleTitle || '');
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

  const handleSave = () => {
    updateProfile({
      bio: bio.trim(),
      roleTitle: roleTitle.trim()
    });
    onComplete();
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
          <h2 className="text-3xl font-bold">Complete Your Profile</h2>
          <p className="text-surface-400 text-sm">
            Set up your public creator identity and bio.
          </p>
        </div>
      </div>

      {/* Avatar Section */}
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

      {/* Role / Title Input */}
      <div className="mb-6">
        <label className="block text-sm font-bold text-surface-300 mb-2">
          <Pencil size={14} className="inline mr-2" />
          Your Role / Title
        </label>
        <input
          type="text"
          value={roleTitle}
          onChange={(e) => setRoleTitle(e.target.value)}
          placeholder="e.g. Artist & Solana Creator, NFT Designer, Web3 Developer"
          className="input-field w-full"
          maxLength={80}
        />
      </div>

      {/* Short Bio Input */}
      <div className="mb-8">
        <label className="block text-sm font-bold text-surface-300 mb-2">
          <Pencil size={14} className="inline mr-2" />
          Short Bio
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell supporters who you are and what you do..."
          className="input-field w-full resize-none"
          rows={3}
          maxLength={280}
        />
        <div className="flex justify-between mt-1.5">
          <p className="text-surface-600 text-xs">{bio.length}/280</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end items-center pt-6 border-t border-surface-800">
        <button
          onClick={handleSave}
          className="btn-primary flex items-center gap-2 group"
        >
          Save & Continue <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
