import React, { useState } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { Mail, ArrowRight, ArrowLeft, KeyRound, CheckCircle, RefreshCw } from 'lucide-react';
import { Card3D } from '../components/Card3D';
import { resetPassword } from '../lib/auth';

/**
 * Maps raw Supabase error messages to user-friendly explanations.
 *
 * Common causes of "Error sending recovery email":
 *  1. Supabase free-tier SMTP rate limit (3 emails/hour)
 *  2. The redirectTo URL is not whitelisted in Supabase Dashboard
 *     → Auth → URL Configuration → Redirect URLs
 *  3. The email address doesn't exist in the auth.users table
 */
  function getFriendlyError(msg: string): string {
    // Always return empty string since we want to show same success message regardless of outcome
    return '';
  }

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await resetPassword(email);
      setSuccess(true);
      // Start a 60-second cooldown before allowing resend
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      // Silently succeed regardless of error
      setSuccess(true);
      setResendCooldown(60);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setIsLoading(true);
    try {
      await resetPassword(email);
      setResendCooldown(60);
      // Create timer display element once
      const timerElement = document.createElement('div');
      timerElement.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      timerElement.id = 'resend-timer';
      document.body.appendChild(timerElement);
      
      // Initialize timer UI
      const timerEl = document.getElementById('resend-timer');
      if (timerEl) timerEl.textContent = `Resend available in ${resendCooldown}s`;
      
      // Start updating timer
      const interval = setInterval(() => {
        setResendCooldown(prev => {
          const newValue = prev - 1;
          // Update UI timer
          if (timerEl) timerEl.textContent = `Resend available in ${newValue}s`;
          if (newValue <= 0) {
            clearInterval(interval);
            if (timerEl) timerEl.remove();
            return 0;
          }
          return newValue;
        });
      }, 1000);
    } catch {
      // Silently succeed regardless of error
      setSuccess(true);
      setResendCooldown(60);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
      <Card3D
        wrapperClassName="w-full max-w-md [perspective:1200px]"
        className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl shadow-2xl shadow-indigo-500/10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 border ${success ? 'bg-green-500/10 border-green-500/20' : 'bg-indigo-500/10 border-indigo-500/20'}`}>
            {success ? (
              <CheckCircle className="w-6 h-6 text-green-400" />
            ) : (
              <KeyRound className="w-6 h-6 text-indigo-400" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {success ? 'Check Your Email' : 'Reset Password'}
          </h1>
          <p className="text-slate-400 text-center">
            {success
              ? <>We sent a password reset link to <span className="text-white font-medium">{email}</span>. Check your inbox and spam folder.</>
              : "Enter your email and we'll send you a link to reset your password."}
          </p>
        </div>

        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1 pb-4">
              <label className="text-sm font-medium text-slate-300">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </motion.button>
          </form>
        ) : (
          <div className="space-y-3">
            {/* Tips */}
            <div className="bg-slate-800/50 rounded-xl p-4 text-sm text-slate-400 space-y-1.5 border border-slate-700/50">
              <p className="font-medium text-slate-300 mb-2">Didn't receive the email?</p>
              <p>• Check your <span className="text-white">spam / junk</span> folder</p>
              <p>• Make sure you entered the correct email</p>
              <p>• The link expires in <span className="text-white">1 hour</span></p>
            </div>

            {/* Resend button */}
            <motion.button
              whileHover={resendCooldown === 0 ? { scale: 1.02 } : {}}
              whileTap={resendCooldown === 0 ? { scale: 0.98 } : {}}
              onClick={handleResend}
              disabled={isLoading || resendCooldown > 0}
              className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Email'}
            </motion.button>

            {/* Try different email */}
            <button
              type="button"
              onClick={() => { setSuccess(false); setEmail(''); setError(''); setResendCooldown(0); }}
              className="w-full text-sm text-slate-500 hover:text-slate-300 transition-colors py-2"
            >
              Try a different email address
            </button>

          </div>
        )}

        <div className="mt-6 text-center">
          <Link to="/sign-in" className="text-sm text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Sign In
          </Link>
        </div>
      </Card3D>
    </div>
  );
}