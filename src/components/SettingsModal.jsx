import { useState, useEffect } from 'react';
import { X, Users, Gift, Info, Download, Trash2, Globe, MapPin, Link as LinkIcon, Bell, Shield, Settings, ChevronRight, Check, Youtube, Instagram, Github, MessageSquare, Twitter } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';

export default function SettingsModal({ isOpen, onClose }) {
  const { profile, updateProfile, publicKey, connected } = useApp();
  const { user: authUser, logout: authLogout, setShowWalletModal } = useAuth();
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    location: '',
    link: '',
    generationSound: 'first'
  });
  const [activeTab, setActiveTab] = useState('account');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        bio: profile.bio || '',
        location: profile.location || '',
        link: profile.link || '',
        generationSound: profile.preferences?.generationSound || 'first'
      });
    }
  }, [profile, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    updateProfile({
      displayName: formData.displayName,
      bio: formData.bio,
      location: formData.location,
      link: formData.link,
      preferences: {
        ...profile.preferences,
        generationSound: formData.generationSound
      }
    });
    
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };
  
  const handleConnectWallet = () => {
    setShowWalletModal(true);
    onClose();
  };

  const handleConnectSocial = (platformId) => {
    // Currently only Google is implemented in backend, others are placeholders for now
    if (platformId === 'google') {
      window.location.href = `${import.meta.env.VITE_API_BASE_URL || 'https://api.eitherway.ai'}/api/auth/google/start?next=${window.location.pathname}`;
    } else {
      alert(`${platformId.charAt(0).toUpperCase() + platformId.slice(1)} integration coming soon!`);
    }
  };

  const address = publicKey?.toBase58() || '';
  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not Connected';

  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-[#0d1117] border border-surface-800 rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
        
        {/* Header */}
        <div className="p-6 md:p-8 flex items-start justify-between">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-600/10 flex items-center justify-center border border-brand-500/20 text-brand-500 shadow-[0_0_20px_rgba(0,210,101,0.1)]">
              <Settings size={24} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white">Settings</h2>
              <p className="text-surface-500 text-sm mt-1">Manage your account and preferences</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-surface-800 text-surface-500 hover:text-white transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-8 border-b border-surface-800 flex gap-8">
          <button 
            onClick={() => setActiveTab('account')}
            className={`pb-4 text-sm font-bold transition-all relative ${
              activeTab === 'account' ? 'text-white' : 'text-surface-500 hover:text-surface-300'
            }`}
          >
            Your Account
            {activeTab === 'account' && (
              <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-brand-500 shadow-[0_0_10px_rgba(0,210,101,0.5)]" />
            )}
          </button>
          {/* Support and other tabs can be added here */}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">
          
          {/* Avatar Section */}
          <section className="space-y-4">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-surface-600">Your Avatar</h3>
             <div className="p-6 bg-surface-900/40 border border-surface-800/60 rounded-2xl flex items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-brand-600 flex items-center justify-center text-white text-2xl font-black shadow-lg border-2 border-surface-900">
                  {getInitials(formData.displayName)}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-surface-400 leading-relaxed mb-4">
                    Your avatar is automatically generated based on your account.
                  </p>
                  <button className="btn-secondary !px-4 !py-2 text-xs font-bold">
                    Change Avatar
                  </button>
                </div>
             </div>
          </section>

          {/* Profile Info Section */}
          <section className="space-y-4">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-surface-600">Profile Information</h3>
             
             <div className="space-y-4">
                <div className="p-4 bg-surface-900/40 border border-surface-800/60 rounded-2xl focus-within:border-brand-500/50 transition-all">
                  <label className="block text-[10px] font-black text-surface-500 uppercase tracking-widest mb-1">Name</label>
                  <input 
                    type="text" 
                    value={formData.displayName}
                    onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                    placeholder="Your full name"
                    className="w-full bg-transparent border-none p-0 text-white placeholder:text-surface-700 focus:ring-0 text-sm md:text-base font-medium"
                  />
                  <p className="text-[10px] text-surface-600 mt-2 italic">Your full name, as visible to others.</p>
                </div>

                <div className="p-4 bg-surface-900/40 border border-surface-800/60 rounded-2xl focus-within:border-brand-500/50 transition-all">
                  <label className="block text-[10px] font-black text-surface-500 uppercase tracking-widest mb-1">Description</label>
                  <textarea 
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                    placeholder="A short bio about yourself"
                    rows={2}
                    className="w-full bg-transparent border-none p-0 text-white placeholder:text-surface-700 focus:ring-0 text-sm md:text-base font-medium resize-none"
                  />
                  <p className="text-[10px] text-surface-600 mt-1 italic">A short description of yourself or your work.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-surface-900/40 border border-surface-800/60 rounded-2xl focus-within:border-brand-500/50 transition-all">
                    <label className="block text-[10px] font-black text-surface-500 uppercase tracking-widest mb-1">Location</label>
                    <div className="flex items-center gap-2">
                       <MapPin size={14} className="text-surface-600" />
                       <input 
                        type="text" 
                        value={formData.location}
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                        placeholder="City, Country"
                        className="w-full bg-transparent border-none p-0 text-white placeholder:text-surface-700 focus:ring-0 text-sm md:text-base font-medium"
                      />
                    </div>
                  </div>
                  <div className="p-4 bg-surface-900/40 border border-surface-800/60 rounded-2xl focus-within:border-brand-500/50 transition-all">
                    <label className="block text-[10px] font-black text-surface-500 uppercase tracking-widest mb-1">Link</label>
                    <div className="flex items-center gap-2">
                       <LinkIcon size={14} className="text-surface-600" />
                       <input 
                        type="text" 
                        value={formData.link}
                        onChange={(e) => setFormData({...formData, link: e.target.value})}
                        placeholder="https://yourwebsite.com"
                        className="w-full bg-transparent border-none p-0 text-white placeholder:text-surface-700 focus:ring-0 text-sm md:text-base font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-surface-600 italic px-2">Where you're based and adding a link to your personal website or portfolio.</div>

                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`w-full py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg ${
                    saveSuccess 
                      ? 'bg-accent-green text-surface-950' 
                      : 'btn-primary shadow-brand-500/20'
                  }`}
                >
                  {isSaving ? (
                    <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  ) : saveSuccess ? (
                    <><Check size={18} /> Profile Saved</>
                  ) : (
                    'Save Profile'
                  )}
                </button>
             </div>
          </section>

          {/* Linked Accounts Section */}
          <section className="space-y-4">
             <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-surface-600">Linked Accounts</h3>
                <span className="text-[10px] text-surface-500 font-bold bg-surface-900 px-2 py-0.5 rounded-full">SECURE</span>
             </div>
             <div className="space-y-3">
                {/* Solana Wallet - Real Check */}
                <div className={`p-5 bg-surface-900/40 border ${connected ? 'border-brand-500/30' : 'border-surface-800/60'} rounded-2xl flex items-center justify-between group transition-all`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl ${connected ? 'bg-brand-500/10' : 'bg-surface-800'} flex items-center justify-center ${connected ? 'text-brand-500' : 'text-surface-400'}`}>
                      <Globe size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">Solana Wallet</h4>
                      <p className="text-xs font-mono text-surface-500 uppercase tracking-tighter mt-0.5">
                        {connected ? shortAddress : 'No Wallet Connected'}
                      </p>
                    </div>
                  </div>
                  {connected ? (
                    <div className="px-3 py-1 bg-brand-500/10 border border-brand-500/20 text-brand-500 rounded-full text-[10px] font-black flex items-center gap-1.5">
                      <div className="w-1 h-1 rounded-full bg-brand-500 animate-pulse" />
                      CONNECTED
                    </div>
                  ) : (
                    <button 
                      onClick={handleConnectWallet}
                      className="btn-primary !px-4 !py-1 text-[10px] font-black uppercase"
                    >
                      Connect
                    </button>
                  )}
                </div>

                {/* Social Platforms */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'twitter', name: 'Twitter (X)', icon: Twitter, color: 'text-[#1DA1F2]', connected: !!profile?.socials?.twitter },
                    { id: 'discord', name: 'Discord', icon: MessageSquare, color: 'text-[#5865F2]', connected: !!profile?.socials?.discord },
                    { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'text-[#FF0000]', connected: !!profile?.socials?.youtube },
                    { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'text-[#E1306C]', connected: !!profile?.socials?.instagram },
                    { id: 'github', name: 'GitHub', icon: Github, color: 'text-[#F0F6FC]', connected: !!profile?.socials?.github },
                    { id: 'pinterest', name: 'Pinterest', icon: Globe, color: 'text-[#BD081C]', connected: !!profile?.socials?.pinterest }
                  ].map((platform) => (
                    <div key={platform.id} className="p-4 bg-surface-900/20 border border-surface-800/60 rounded-xl flex items-center justify-between hover:bg-surface-900/40 transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg bg-surface-900 flex items-center justify-center ${platform.connected ? platform.color : 'text-surface-600'}`}>
                          <platform.icon size={16} />
                        </div>
                        <span className="text-xs font-bold text-surface-200">{platform.name}</span>
                      </div>
                      {platform.connected ? (
                        <div className="text-[10px] font-black text-brand-500 flex items-center gap-1">
                          <Check size={12} /> VERIFIED
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleConnectSocial(platform.id)}
                          className="text-[10px] font-black uppercase text-surface-500 hover:text-white transition-colors bg-surface-800 px-3 py-1 rounded-lg"
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="p-5 bg-surface-900/10 border border-dashed border-surface-800 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                   <div className="flex items-start gap-4">
                      <div className="mt-1">
                        <Info size={16} className="text-surface-600" />
                      </div>
                      <p className="text-xs text-surface-500 leading-relaxed max-w-md">
                        Merging accounts allows you to consolidate tips and analytics across multiple wallets or email providers.
                      </p>
                   </div>
                   <div className="flex gap-2 w-full md:w-auto">
                      <input 
                        type="text" 
                        placeholder="Wallet address or email"
                        className="flex-1 md:w-48 bg-surface-950 border border-surface-800 rounded-xl px-4 py-2 text-xs outline-none focus:border-brand-500/40"
                      />
                      <button className="bg-brand-600 font-black text-[10px] px-4 rounded-xl hover:bg-brand-500 transition-colors">Link</button>
                   </div>
                </div>
             </div>
          </section>

          {/* Data & Privacy Section */}
          <section className="space-y-4">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-surface-600">Data & Privacy</h3>
             <div className="p-6 bg-surface-900/40 border border-surface-800/60 rounded-2xl">
                <h4 className="font-bold text-white text-sm">Export Your Data</h4>
                <p className="text-xs text-surface-500 mt-2 leading-relaxed">
                  Download all your personal data in JSON format. This includes your profile, sessions, apps, and payment history.
                </p>
                <button className="btn-secondary !px-4 !py-2.5 text-xs font-bold mt-6 flex items-center gap-2">
                  <Download size={14} /> Download My Data
                </button>
             </div>
          </section>

          {/* Danger Zone */}
          <section className="space-y-4">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-red/80">Danger Zone</h3>
             <div className="p-6 bg-accent-red/5 border border-accent-red/20 rounded-2xl flex flex-col gap-4">
                {(connected || authUser) && (
                  <div>
                    <h4 className="font-bold text-white text-sm">Logout</h4>
                    <p className="text-xs text-surface-500 mt-2 leading-relaxed">
                      Sign out of your current session.
                    </p>
                    <button 
                      onClick={() => { authLogout(); onClose(); }}
                      className="px-4 py-2.5 bg-surface-800 border border-surface-700 text-white rounded-xl text-xs font-bold mt-4 hover:bg-surface-700 transition-all"
                    >
                      Logout Account
                    </button>
                  </div>
                )}

                <div>
                  <h4 className="font-bold text-white text-sm">Delete Account</h4>
                  <p className="text-xs text-surface-500 mt-2 leading-relaxed">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  <button className="px-4 py-2.5 bg-accent-red/10 border border-accent-red/30 text-accent-red rounded-xl text-xs font-bold mt-4 hover:bg-accent-red/20 transition-all flex items-center gap-2">
                    <Trash2 size={14} /> Delete Account
                  </button>
                </div>
             </div>
          </section>

        </div>

      </div>
    </div>
  );
}
