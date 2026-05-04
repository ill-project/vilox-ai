import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router';
import { motion } from 'motion/react';
import { Mail, Lock, ArrowRight, Loader2, AlertCircle, TrendingUp, Shield, Zap } from 'lucide-react';
import { signIn } from '../lib/auth';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
  { icon: TrendingUp, text: 'AI-powered trading signals' },
  { icon: Shield,     text: 'Bank-grade security' },
  { icon: Zap,        text: 'Real-time market data' },
];

export function FrontPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState('');

  // Already logged in → skip front page
  if (!isLoading && user) return <Navigate to="/app/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signIn(email, password);
      navigate('/app/dashboard');
    } catch (err: unknown) {
      const msg = (err as Error).message ?? '';
      if (msg.toLowerCase().includes('not confirmed')) {
        setError('Please confirm your email before signing in. Check your inbox.');
      } else if (msg.toLowerCase().includes('invalid login') || msg.toLowerCase().includes('invalid credentials')) {
        setError('Incorrect email or password.');
      } else if (msg.toLowerCase().includes('rate limit')) {
        setError('Too many attempts. Please wait a moment and try again.');
      } else {
        setError(msg || 'Sign in failed. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F1A] flex overflow-hidden">

      {/* ── Left panel — branding ─────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] relative p-12 overflow-hidden">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-[#4C6FFF]/10 blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-[#00FFA3]/8 blur-[100px]" />
        </div>

        {/* Grid overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#4C6FFF] flex items-center justify-center shadow-lg shadow-[#4C6FFF]/40">
            <TrendingUp size={18} className="text-white" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Vilox<span className="text-[#4C6FFF]">AI</span></span>
        </div>

        {/* Tagline */}
        <div className="relative z-10">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-5xl font-bold text-white leading-tight mb-5">
              Trade smarter<br />
              <span className="text-[#4C6FFF]">with AI</span>
            </h1>
            <p className="text-[#9CA3AF] text-lg mb-10 leading-relaxed max-w-sm">
              Your intelligent trading platform — monitor markets, automate strategies, and grow your portfolio.
            </p>
            <div className="space-y-4">
              {FEATURES.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#4C6FFF]/15 border border-[#4C6FFF]/20 flex items-center justify-center">
                    <Icon size={15} className="text-[#4C6FFF]" />
                  </div>
                  <span className="text-[#D1D5DB] text-sm">{text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Stats row */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.6 }}
          className="relative z-10 flex gap-8">
          {[['$2.4B+', 'Volume traded'], ['50K+', 'Active users'], ['99.9%', 'Uptime']].map(([val, lbl]) => (
            <div key={lbl}>
              <p className="text-2xl font-bold text-white">{val}</p>
              <p className="text-xs text-[#6B7280] mt-0.5">{lbl}</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Right panel — sign-in form ────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <div className="w-9 h-9 rounded-xl bg-[#4C6FFF] flex items-center justify-center">
            <TrendingUp size={16} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg">Vilox<span className="text-[#4C6FFF]">AI</span></span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-1.5">Welcome back</h2>
            <p className="text-[#6B7280] text-sm">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-[#9CA3AF] mb-1.5">Email address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4B5563]" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full bg-[#111827] border border-[#1F2937] text-white text-sm rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-[#4C6FFF] focus:ring-1 focus:ring-[#4C6FFF]/30 placeholder-[#4B5563] transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-[#9CA3AF] mb-1.5">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4B5563]" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-[#111827] border border-[#1F2937] text-white text-sm rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-[#4C6FFF] focus:ring-1 focus:ring-[#4C6FFF]/30 placeholder-[#4B5563] transition-colors"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2.5 bg-[#FF4D4D]/10 border border-[#FF4D4D]/20 rounded-xl px-4 py-3">
                <AlertCircle size={15} className="text-[#FF4D4D] shrink-0 mt-0.5" />
                <p className="text-xs text-[#FF4D4D] leading-relaxed">{error}</p>
              </motion.div>
            )}

            {/* Submit */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={busy}
              className="w-full bg-[#4C6FFF] hover:bg-[#3a5cff] text-white font-semibold rounded-xl py-3 text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-[#4C6FFF]/25 mt-2"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <>Sign In <ArrowRight size={15} /></>}
            </motion.button>
          </form>

          <div className="mt-8 pt-8 border-t border-[#1F2937] text-center">
            <p className="text-xs text-[#4B5563]">
              © {new Date().getFullYear()} ViloxAI. All rights reserved.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
