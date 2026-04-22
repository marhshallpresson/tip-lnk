import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, CheckCircle, AlertCircle, ChevronLeft } from 'lucide-react';
import api from '../lib/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | success | error
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token || !email) {
      setError('Invalid or missing reset link. Please request a new one.');
      setStatus('error');
    }
  }, [token, email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/auth/reset-password-verify', { token, email, password });
      if (res.ok && res.data.success) {
        setStatus('success');
      } else {
        setError(res.data.error || 'Failed to reset password.');
        setStatus('error');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-surface-950">
        <div className="glass-card max-w-md w-full p-8 text-center animate-scale-in">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={32} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Password Reset!</h2>
          <p className="text-white/40 text-sm mb-8 leading-relaxed">
            Your password has been successfully updated. You can now log in with your new credentials.
          </p>
          <button onClick={() => navigate('/')} className="btn-primary w-full">
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-surface-950">
      <div className="glass-card max-w-md w-full p-8 animate-slide-up">
        <div className="flex items-center gap-4 mb-8">
            <button onClick={() => navigate('/')} className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all">
                <ChevronLeft size={20} />
            </button>
            <h2 className="text-2xl font-bold text-white">New Password</h2>
        </div>

        {error && (
            <div className="mb-6 p-4 bg-red-500/5 border border-red-500/10 rounded-lg flex items-start gap-3 text-red-500 text-sm">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p>{error}</p>
            </div>
        )}

        <p className="text-white/40 text-sm mb-8 leading-relaxed">
            Please choose a strong password to secure your TipLnk account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider ml-1">New Password</label>
                <div className="relative mt-1">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                    <input 
                        type={showPassword ? "text" : "password"} 
                        required 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input-field w-full !pl-12 !pr-12" 
                        placeholder="••••••••" 
                    />
                    <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
            </div>

            <div>
                <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider ml-1">Confirm Password</label>
                <div className="relative mt-1">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                    <input 
                        type={showPassword ? "text" : "password"} 
                        required 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="input-field w-full !pl-12" 
                        placeholder="••••••••" 
                    />
                </div>
            </div>

            <button 
                type="submit" 
                disabled={loading || status === 'error' && !token}
                className="btn-primary w-full !mt-6"
            >
                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Update Password'}
            </button>
        </form>
      </div>
    </div>
  );
}
