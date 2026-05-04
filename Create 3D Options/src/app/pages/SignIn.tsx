import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router';
import { motion } from 'motion/react';
import { Activity, Mail, Lock, ArrowRight, KeyRound, Eye, EyeOff } from 'lucide-react';
import { Card3D } from '../components/Card3D';
import { signIn } from '../lib/auth';
import { supabase } from '../lib/supabase';

export function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo ?? '/app/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [showPassword, setShowPassword] = useState(false);

  // Email OTP state
  const [otpMode, setOtpMode] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpError, setOtpError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await signIn(email, password);
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('profiles').select('status').eq('id', session.user.id).single();
        if (profile?.status === 'blocked') {
          await supabase.auth.signOut();
          throw new Error('Your account has been suspended. Please contact support@viloxai.com');
        }
      }
      navigate(returnTo);
    } catch (err: any) {
      const msg: string = err.message ?? '';
      if (msg.toLowerCase().includes('email not confirmed') || msg.toLowerCase().includes('not confirmed')) {
        setError('Please confirm your email before signing in. Check your inbox (and spam folder) for the confirmation link.');
      } else if (msg.toLowerCase().includes('invalid login') || msg.toLowerCase().includes('invalid credentials')) {
        setError('Incorrect email or password. If you just signed up, check your inbox to confirm your email first.');
      } else if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('over_email_send_rate_limit')) {
        setError('Email rate limit reached. Go to Supabase Dashboard → Authentication → Email → turn OFF "Confirm email", then try again.');
      } else {
        setError(msg || 'Sign in failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    setOtpBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: otpEmail, options: { shouldCreateUser: false } });
      if (error) throw error;
      setOtpSent(true);
    } catch (err: any) {
      setOtpError(err.message || 'Failed to send code. Check the email address.');
    } finally {
      setOtpBusy(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    setOtpBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email: otpEmail, token: otpCode, type: 'email' });
      if (error) throw error;
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('profiles').select('status').eq('id', session.user.id).single();
        if (profile?.status === 'blocked') {
          await supabase.auth.signOut();
          throw new Error('Your account has been suspended. Please contact support@viloxai.com');
        }
      }
      navigate(returnTo);
    } catch (err: any) {
      setOtpError(err.message || 'Invalid or expired code. Try again.');
    } finally {
      setOtpBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
      <Card3D 
        wrapperClassName="w-full max-w-md [perspective:1200px]" 
        className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl shadow-2xl shadow-indigo-500/10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center mb-4 border border-indigo-500/20">
            <Activity className="w-6 h-6 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-slate-400 text-center">Sign in to your Vilox AI account to access your portfolio.</p>
        </div>

        {/* Toggle */}
        <div className="flex rounded-xl border border-slate-700 p-1 mb-6 gap-1">
          <button type="button" onClick={() => { setOtpMode(false); setError(''); setOtpError(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${!otpMode ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            <Lock className="w-3.5 h-3.5" /> Password
          </button>
          <button type="button" onClick={() => { setOtpMode(true); setError(''); setOtpError(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${otpMode ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            <KeyRound className="w-3.5 h-3.5" /> Email Code
          </button>
        </div>

        {!otpMode ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-300">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  placeholder="you@example.com" required />
              </div>
            </div>
            <div className="space-y-1 pb-4">
              <label className="text-sm font-medium text-slate-300">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-xl py-3 pl-10 pr-10 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  placeholder="••••••••" required />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-70">
              {isLoading ? 'Authenticating...' : 'Sign In'}
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </motion.button>
            {error && <p className="text-sm text-red-400 text-center pt-1">{error}</p>}
          </form>
        ) : (
          !otpSent ? (
            <form onSubmit={sendOtp} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-300">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input type="email" value={otpEmail} onChange={e => setOtpEmail(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    placeholder="you@example.com" required />
                </div>
              </div>
              <p className="text-xs text-slate-500">We'll send a 6-digit code to your email. No password needed.</p>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={otpBusy}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-70">
                {otpBusy ? 'Sending...' : 'Send Code'} {!otpBusy && <ArrowRight className="w-4 h-4" />}
              </motion.button>
              {otpError && <p className="text-sm text-red-400 text-center pt-1">{otpError}</p>}
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="space-y-4">
              <div className="text-center mb-2">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center mx-auto mb-3 border border-indigo-500/20">
                  <KeyRound className="w-6 h-6 text-indigo-400" />
                </div>
                <p className="text-sm text-slate-400">Code sent to <span className="text-white font-medium">{otpEmail}</span></p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-300">6-Digit Code</label>
                <input type="text" value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-xl py-3 px-4 text-white text-center text-2xl tracking-widest font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  placeholder="000000" maxLength={6} required />
              </div>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={otpBusy || otpCode.length < 6}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-70">
                {otpBusy ? 'Verifying...' : 'Verify & Sign In'} {!otpBusy && <ArrowRight className="w-4 h-4" />}
              </motion.button>
              <button type="button" onClick={() => { setOtpSent(false); setOtpCode(''); setOtpError(''); }}
                className="w-full text-sm text-slate-500 hover:text-slate-300 transition-colors pt-1">
                ← Use a different email
              </button>
              {otpError && <p className="text-sm text-red-400 text-center">{otpError}</p>}
            </form>
          )
        )}

        <p className="mt-6 text-center text-slate-400 text-sm">
          Don't have an account?{' '}
          <Link to="/get-started" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            Get Started
          </Link>
        </p>
      </Card3D>
    </div>
  );
}
