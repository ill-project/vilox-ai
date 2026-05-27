import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { motion } from 'motion/react';
import { Lock, ArrowRight, Eye, EyeOff, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Card3D } from '../components/Card3D';
import { supabase } from '../lib/supabase';

export function UpdatePasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  // 'checking' | 'valid' | 'invalid'
  const [recoveryState, setRecoveryState] = useState<'checking' | 'valid' | 'invalid'>('checking');

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event fired by Supabase when the
    // user clicks the reset link in their email (which contains #access_token).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Valid recovery session — allow the user to set a new password
        setRecoveryState('valid');
      } else if (event === 'SIGNED_IN' && session) {
        // Already signed in (e.g. user navigated here while logged in)
        // Still allow password update
        setRecoveryState('valid');
      }
    });

    // Also check if there's already an active session (handles page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setRecoveryState('valid');
      } else {
        // No session yet — give the Supabase client a moment to process
        // the #access_token hash from the URL and fire onAuthStateChange
        const timer = setTimeout(() => {
          setRecoveryState(prev => {
            // If still 'checking' after timeout, the link is invalid/expired
            if (prev === 'checking') return 'invalid';
            return prev;
          });
        }, 2000);
        return () => clearTimeout(timer);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
      // Sign out after password update so user logs in fresh with new password
      await supabase.auth.signOut();
      setTimeout(() => {
        navigate('/sign-in');
      }, 2500);
    } catch (err: any) {
      const msg: string = err.message ?? '';
      if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('invalid')) {
        setError('Your reset link has expired. Please request a new one.');
      } else {
        setError(msg || 'Failed to update password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state while verifying the recovery token
  if (recoveryState === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F111A]">
        <div className="text-indigo-400 animate-pulse text-xl">Verifying secure link...</div>
      </div>
    );
  }

  // Invalid / expired link
  if (recoveryState === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
        <Card3D
          wrapperClassName="w-full max-w-md [perspective:1200px]"
          className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl shadow-2xl shadow-indigo-500/10"
        >
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mb-4 border border-red-500/20">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Link Expired</h1>
            <p className="text-slate-400 text-center text-sm">
              This password reset link is invalid or has expired. Reset links are only valid for a short time.
            </p>
          </div>
          <Link
            to="/forgot-password"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            Request a New Link
          </Link>
          <div className="mt-4 text-center">
            <Link to="/sign-in" className="text-sm text-slate-400 hover:text-white transition-colors">
              Back to Sign In
            </Link>
          </div>
        </Card3D>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
      <Card3D
        wrapperClassName="w-full max-w-md [perspective:1200px]"
        className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl shadow-2xl shadow-indigo-500/10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 border ${success ? 'bg-green-500/10 border-green-500/20' : 'bg-indigo-500/10 border-indigo-500/20'}`}>
            {success ? (
              <ShieldCheck className="w-6 h-6 text-green-400" />
            ) : (
              <Lock className="w-6 h-6 text-indigo-400" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {success ? 'Password Updated!' : 'Create New Password'}
          </h1>
          <p className="text-slate-400 text-center">
            {success
              ? 'Your password has been successfully reset. Redirecting you to sign in...'
              : 'Enter and confirm your new password below.'}
          </p>
        </div>

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-300">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-xl py-3 pl-10 pr-10 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  placeholder="Min. 6 characters"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1 pb-4">
              <label className="text-sm font-medium text-slate-300">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-xl py-3 pl-10 pr-10 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  placeholder="Re-enter your password"
                  required
                />
              </div>
            </div>

            {/* Password match indicator */}
            {confirmPassword.length > 0 && (
              <p className={`text-xs -mt-2 ${password === confirmPassword ? 'text-green-400' : 'text-red-400'}`}>
                {password === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
              </p>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading || !password || !confirmPassword}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
            >
              {isLoading ? 'Updating...' : 'Update Password'}
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </motion.button>
            {error && <p className="text-sm text-red-400 text-center pt-1">{error}</p>}
          </form>
        )}
      </Card3D>
    </div>
  );
}
