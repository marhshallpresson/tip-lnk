import { useState, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { Upload, User, RefreshCw, ChevronRight, ChevronLeft, Pencil, Loader2 } from 'lucide-react';
import api from '../lib/api';

export default function ProfileEditor({ onComplete, onBack }) {
  const { profile, updateProfile } = useApp();
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [roleTitle, setRoleTitle] = useState(profile.roleTitle || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [dob, setDob] = useState(profile.dob || '');
  const [address, setAddress] = useState(profile.address || '');
  const [city, setCity] = useState(profile.city || '');
  const [country, setCountry] = useState(profile.country || '');
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

  const handleSave = async () => {
    const cleanName = displayName.trim();
    
    setLoading(true);
    try {
      // ─── ELITE IDENTITY SYNC: CORE NAME ───
      // We update the legal/account name in the backend to match the display name.
      await api.post('/auth/update-name', { name: cleanName });
      
      updateProfile({
        displayName: cleanName,
        bio: bio.trim(),
        roleTitle: roleTitle.trim()
      });
      onComplete();
    } catch (err) {
      console.error('🛡️ Profile Save Fault:', err);
      // We still allow local update if backend fails (optimistic)
      updateProfile({
        displayName: cleanName,
        bio: bio.trim(),
        roleTitle: roleTitle.trim()
      });
      onComplete();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all border border-white/5"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-left">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">Complete <span className="text-brand-500">Profile</span></h2>
          <p className="text-white/40 text-sm md:text-base">
            Set up your public identity and bio.
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 mb-10">
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative group">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-[32px] overflow-hidden ring-4 ring-brand-500/20 bg-white/5 shadow-2xl relative">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User size={48} className="text-white/20" />
                </div>
              )}

              {(isUploading || loading) && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                  <RefreshCw size={24} className="text-brand-500 animate-spin" />
                </div>
              )}
            </div>

            <button
              onClick={triggerUpload}
              disabled={loading}
              className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-brand-500 text-black flex items-center justify-center shadow-lg hover:scale-110 transition-transform active:scale-90"
            >
              <Upload size={18} strokeWidth={3} />
            </button>
          </div>

          <div className="text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400 bg-brand-500/10 px-2.5 py-1 rounded-full border border-brand-500/20">
              {getSourceLabel()}
            </span>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
          />
        </div>

        {/* Inputs Section */}
        <div className="flex-1 space-y-6">
          <div>
            <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2 ml-1">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-brand-500/50 focus:bg-white/[0.07] transition-all"
              maxLength={50}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2 ml-1">
              Role / Headline
            </label>
            <input
              type="text"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              placeholder="e.g. 3D Artist & Gamer"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-brand-500/50 focus:bg-white/[0.07] transition-all"
              maxLength={80}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2 ml-1">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell the world who you are..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-brand-500/50 focus:bg-white/[0.07] transition-all resize-none"
              rows={3}
              maxLength={280}
            />
            <div className="flex justify-end mt-2">
              <p className="text-white/20 text-[10px] font-bold">{bio.length}/280</p>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6 mt-6 border-t border-white/5 text-left mb-10">
        <h3 className="text-white font-bold mb-4">Payout Details (Required for Fiat Withdrawal)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2 ml-1">Phone Number</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234..." className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-brand-500/50 focus:bg-white/[0.07] transition-all" />
          </div>
          <div>
            <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2 ml-1">Date of Birth</label>
            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-brand-500/50 focus:bg-white/[0.07] transition-all" />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2 ml-1">Address</label>
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Street Name" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-brand-500/50 focus:bg-white/[0.07] transition-all" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2 ml-1">City</label>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Lagos" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-brand-500/50 focus:bg-white/[0.07] transition-all" />
          </div>
          <div>
            <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2 ml-1">Country (ISO)</label>
            <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="NG" maxLength={2} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-brand-500/50 focus:bg-white/[0.07] transition-all" />
          </div>
        </div>
      </div>

      <div className="pt-8 border-t border-white/5">
        <button
          onClick={handleSave}
          disabled={loading || !displayName.trim()}
          className="btn-primary w-full py-4 rounded-2xl text-lg font-bold group shadow-lg shadow-brand-500/10"
        >
          {loading ? <Loader2 size={24} className="animate-spin mx-auto" /> : <>Finalize Profile <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" /></>}
        </button>
      </div>
    </div>
  );
}
