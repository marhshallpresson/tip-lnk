import React, { useState, useEffect } from 'react';
import { Mail, Loader2, CheckCircle, ChevronLeft, ArrowRight, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

export default function AuthCompletion() {
  const { user, refreshUser, logout } = useAuth();
  const [view, setView] = useState('email-prompt'); // email-prompt | email-verify | email-success
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // If user is already verified and has a name, redirect them away
  useEffect(() => {
    if (user?.email && user?.emailVerifiedAt && user?.name) {
      navigate('/onboarding');
    }
  }, [user, navigate]);

  const handleStartLinking = async (e) => {
    e.preventDefault();

    if (!name || name.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/link-email/start', { email, name: name.trim() });
      if (res.ok && res.data.success) {
        setView('email-verify');
      } else {
        setError(res.data.error || 'Failed to send verification code.');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/link-email/verify', { email, code, name: name.trim() });
      if (res.ok && res.data.success) {
        await refreshUser();
        setView('email-success');
      } else {
        setError(res.data.error || 'Invalid or expired verification code.');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    navigate('/onboarding');
  };

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Branding */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.05]">
          <img src="/logo.svg" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] blur-[120px]" alt="" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        {view === 'email-prompt' && (
          <div className="glass-card p-8 sm:p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center mx-auto mb-8 border border-brand-500/20">
                <ShieldCheck size={32} className="text-brand-500" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Secure your Profile</h2>
            <p className="text-surface-400 text-sm mb-8 leading-relaxed">
                TipLnk requires a verified email and full name to protect your earnings and ensure account recovery.
            </p>
            
            {error && (
              <div className="mb-6 p-4 bg-accent-red/10 border border-accent-red/20 rounded-xl text-accent-red text-xs text-left animate-shake">
                {error}
              </div>
            )}

            <form onSubmit={handleStartLinking} className="space-y-4 text-left">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-surface-500 ml-1">Full Name</label>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-600" />
                  <input 
                    type="text" 
                    required 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    className="input-field w-full !pl-12 h-14" 
                    placeholder="e.g. John Doe" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-surface-500 ml-1">Email Address</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-600" />
                  <input 
                    type="email" 
                    required 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field w-full !pl-12 h-14" 
                    placeholder="name@example.com" 
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={loading} 
                className="btn-primary w-full h-14 text-base font-bold flex items-center justify-center gap-2 group"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : <>Continue <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>}
              </button>
            </form>
            
            <button 
              onClick={logout}
              className="mt-8 text-surface-500 hover:text-white text-xs font-bold transition-colors uppercase tracking-widest"
            >
              Sign out and try again
            </button>
          </div>
        )}

        {view === 'email-verify' && (
          <div className="glass-card p-8 sm:p-10 text-center">
            <div className="flex items-center justify-between mb-8">
              <button 
                onClick={() => setView('email-prompt')} 
                className="p-2 rounded-xl bg-surface-900 border border-white/5 text-surface-400 hover:text-white transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex-1 text-center pr-8">
                <h3 className="font-bold text-white">Verification</h3>
              </div>
            </div>

            <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center mx-auto mb-8 border border-brand-500/20">
                <Mail size={32} className="text-brand-500" />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">Check your inbox</h2>
            <p className="text-surface-400 text-sm mb-8">
              We've sent a 6-digit code to <br/>
              <span className="text-white font-bold">{email}</span>
            </p>

            {error && (
              <div className="mb-6 p-4 bg-accent-red/10 border border-accent-red/20 rounded-xl text-accent-red text-xs text-left">
                {error}
              </div>
            )}

            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div className="flex justify-center">
                <input 
                  type="text" 
                  maxLength={6} 
                  required 
                  autoFocus 
                  value={code} 
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full max-w-[240px] h-16 bg-surface-900 border border-white/10 rounded-2xl text-center text-3xl tracking-[0.4em] font-black text-white focus:border-brand-500 transition-all outline-none" 
                  placeholder="000000" 
                />
              </div>
              <button 
                type="submit" 
                disabled={loading} 
                className="btn-primary w-full h-14 text-base font-bold"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : 'Verify Code'}
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-white/5">
              <p className="text-surface-500 text-xs mb-4">Didn't receive the code?</p>
              <button 
                onClick={handleStartLinking}
                disabled={loading}
                className="text-brand-500 hover:text-brand-400 text-xs font-black uppercase tracking-widest transition-colors"
              >
                Resend Code
              </button>
            </div>
          </div>
        )}

        {view === 'email-success' && (
          <div className="glass-card p-8 sm:p-10 text-center">
            <div className="w-20 h-20 rounded-3xl bg-accent-green/10 flex items-center justify-center mx-auto mb-8 border border-accent-green/20">
                <CheckCircle size={40} className="text-accent-green" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Account Verified</h2>
            <p className="text-surface-400 text-sm mb-10 leading-relaxed">
              Fantastic! Your account is now secure. <br/>
              Let's finish setting up your creator profile.
            </p>
            
            <button 
              onClick={handleContinue}
              className="btn-primary w-full h-14 text-base font-bold flex items-center justify-center gap-2"
            >
              Continue to Onboarding <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
cent-green" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Account Verified</h2>
            <p className="text-surface-400 text-sm mb-10 leading-relaxed">
              Fantastic! Your account is now secure. <br/>
              Let's finish setting up your creator profile.
            </p>
            
            <button 
              onClick={handleContinue}
              className="btn-primary w-full h-14 text-base font-bold flex items-center justify-center gap-2"
            >
              Continue to Onboarding <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
