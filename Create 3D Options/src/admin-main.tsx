import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AdminPage } from './app/pages/AdminPage';

// Isolated admin Supabase client — shared module so db.ts can also resolve
// the admin session token when the admin panel calls Edge Functions.
import { supabaseAdminPanel as supabase } from './app/lib/supabaseAdminPanel';
import { Loader2, Mail, Lock, TrendingUp, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import './styles/index.css';

function AdminSignIn({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<'signin' | 'forgot'>('signin');
  const [resetSent, setResetSent] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      // Check admin flag
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session after sign in');
      const { data, error: checkError } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).maybeSingle();
      if (checkError || !data?.is_admin) {
        await supabase.auth.signOut();
        setError('Access denied. This account does not have admin privileges.');
      } else {
        onSuccess();
      }
    } catch (err: unknown) {
      const msg = (err as Error).message ?? '';
      if (msg.toLowerCase().includes('invalid login') || msg.toLowerCase().includes('invalid credentials')) {
        setError('Incorrect email or password.');
      } else if (msg.toLowerCase().includes('not confirmed')) {
        setError('Please confirm your email first.');
      } else {
        setError(msg || 'Sign in failed.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetBusy(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}${window.location.pathname}`,
      });
      if (resetError) throw resetError;
      setResetSent(true);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to send reset email.');
    } finally {
      setResetBusy(false);
    }
  };

  const Logo = () => (
    <div className="flex items-center gap-3 justify-center mb-8">
      <div className="w-10 h-10 rounded-xl bg-[#4C6FFF] flex items-center justify-center shadow-lg shadow-[#4C6FFF]/40">
        <TrendingUp size={18} className="text-white" />
      </div>
      <span className="text-white font-bold text-xl">Vilox<span className="text-[#4C6FFF]">AI</span> <span className="text-[#6B7280] text-sm font-normal">Admin</span></span>
    </div>
  );

  if (view === 'forgot') {
    return (
      <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <Logo />
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-8 shadow-2xl">
            {resetSent ? (
              <div className="text-center py-4">
                <CheckCircle2 size={40} className="text-[#00FFA3] mx-auto mb-4" />
                <h2 className="text-lg font-bold text-white mb-2">Check your email</h2>
                <p className="text-sm text-[#9CA3AF] mb-6">We sent a password reset link to <span className="text-white">{resetEmail}</span>.</p>
                <button onClick={() => { setView('signin'); setResetSent(false); setError(''); }} className="text-sm text-[#4C6FFF] hover:underline flex items-center gap-1 mx-auto">
                  <ArrowLeft size={13} /> Back to sign in
                </button>
              </div>
            ) : (
              <>
                <button onClick={() => { setView('signin'); setError(''); }} className="flex items-center gap-1 text-xs text-[#6B7280] hover:text-white mb-5 transition-colors">
                  <ArrowLeft size={13} /> Back
                </button>
                <h2 className="text-xl font-bold text-white mb-1">Reset Password</h2>
                <p className="text-sm text-[#6B7280] mb-6">Enter your admin email and we'll send a reset link.</p>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#9CA3AF] mb-1.5">Email</label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4B5563]" />
                      <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required placeholder="admin@example.com"
                        className="w-full bg-[#0B0F1A] border border-[#1F2937] text-white text-sm rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-[#4C6FFF] placeholder-[#4B5563] transition-colors" />
                    </div>
                  </div>
                  {error && (
                    <div className="flex items-start gap-2 bg-[#FF4D4D]/10 border border-[#FF4D4D]/20 rounded-xl px-4 py-3">
                      <AlertCircle size={14} className="text-[#FF4D4D] shrink-0 mt-0.5" />
                      <p className="text-xs text-[#FF4D4D]">{error}</p>
                    </div>
                  )}
                  <button type="submit" disabled={resetBusy}
                    className="w-full bg-[#4C6FFF] hover:bg-[#3a5cff] text-white font-semibold rounded-xl py-3 text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60 shadow-lg shadow-[#4C6FFF]/25">
                    {resetBusy ? <Loader2 size={15} className="animate-spin" /> : 'Send Reset Link'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Logo />

        {/* Card */}
        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-1">Admin Sign In</h2>
          <p className="text-sm text-[#6B7280] mb-6">Access restricted to administrators only.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#9CA3AF] mb-1.5">Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4B5563]" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="admin@example.com"
                  className="w-full bg-[#0B0F1A] border border-[#1F2937] text-white text-sm rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-[#4C6FFF] placeholder-[#4B5563] transition-colors" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-[#9CA3AF]">Password</label>
                <button type="button" onClick={() => { setResetEmail(email); setView('forgot'); setError(''); }}
                  className="text-xs text-[#4C6FFF] hover:underline transition-colors">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4B5563]" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
                  className="w-full bg-[#0B0F1A] border border-[#1F2937] text-white text-sm rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-[#4C6FFF] placeholder-[#4B5563] transition-colors" />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-[#FF4D4D]/10 border border-[#FF4D4D]/20 rounded-xl px-4 py-3">
                <AlertCircle size={14} className="text-[#FF4D4D] shrink-0 mt-0.5" />
                <p className="text-xs text-[#FF4D4D]">{error}</p>
              </div>
            )}

            <button type="submit" disabled={busy}
              className="w-full bg-[#4C6FFF] hover:bg-[#3a5cff] text-white font-semibold rounded-xl py-3 text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60 mt-2 shadow-lg shadow-[#4C6FFF]/25">
              {busy ? <Loader2 size={15} className="animate-spin" /> : 'Sign In to Admin'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function SetNewPassword({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setBusy(true);
    setError('');
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      window.history.replaceState(null, '', window.location.pathname);
      // Check admin access with the now-active session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session after password update.');
      const { data } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).maybeSingle();
      if (!data?.is_admin) {
        await supabase.auth.signOut();
        setError('Password updated, but this account does not have admin access.');
        setBusy(false);
        return;
      }
      setDone(true);
      setTimeout(() => { onSuccess(); }, 1500);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to update password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#4C6FFF] flex items-center justify-center shadow-lg shadow-[#4C6FFF]/40">
            <TrendingUp size={18} className="text-white" />
          </div>
          <span className="text-white font-bold text-xl">Vilox<span className="text-[#4C6FFF]">AI</span> <span className="text-[#6B7280] text-sm font-normal">Admin</span></span>
        </div>
        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-8 shadow-2xl">
          {done ? (
            <div className="text-center py-4">
              <CheckCircle2 size={40} className="text-[#00FFA3] mx-auto mb-4" />
              <h2 className="text-lg font-bold text-white mb-2">Password updated!</h2>
              <p className="text-sm text-[#9CA3AF]">Redirecting you to sign in…</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-white mb-1">Set New Password</h2>
              <p className="text-sm text-[#6B7280] mb-6">Choose a strong password for your admin account.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#9CA3AF] mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4B5563]" />
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min. 8 characters"
                      className="w-full bg-[#0B0F1A] border border-[#1F2937] text-white text-sm rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-[#4C6FFF] placeholder-[#4B5563] transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#9CA3AF] mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4B5563]" />
                    <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="Repeat password"
                      className="w-full bg-[#0B0F1A] border border-[#1F2937] text-white text-sm rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-[#4C6FFF] placeholder-[#4B5563] transition-colors" />
                  </div>
                </div>
                {error && (
                  <div className="flex items-start gap-2 bg-[#FF4D4D]/10 border border-[#FF4D4D]/20 rounded-xl px-4 py-3">
                    <AlertCircle size={14} className="text-[#FF4D4D] shrink-0 mt-0.5" />
                    <p className="text-xs text-[#FF4D4D]">{error}</p>
                  </div>
                )}
                <button type="submit" disabled={busy}
                  className="w-full bg-[#4C6FFF] hover:bg-[#3a5cff] text-white font-semibold rounded-xl py-3 text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60 shadow-lg shadow-[#4C6FFF]/25">
                  {busy ? <Loader2 size={15} className="animate-spin" /> : 'Update Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminApp() {
  const [status, setStatus] = useState<'loading' | 'allowed' | 'signin' | 'recovery'>('loading');

  const checkSession = async () => {
    // PKCE flow: Supabase sends ?code= query param
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      try {
        await supabase.auth.exchangeCodeForSession(code);
      } catch (_) { /* invalid/expired code — fall through to signin */ }
      // Clean up URL
      window.history.replaceState(null, '', window.location.pathname);
      const { data: { session } } = await supabase.auth.getSession();
      if (session) { setStatus('recovery'); return; }
    }
    // Legacy implicit flow: hash contains type=recovery
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      await supabase.auth.getSession();
      window.history.replaceState(null, '', window.location.pathname);
      setStatus('recovery');
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setStatus('signin'); return; }
    const { data } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).maybeSingle();
    setStatus(data?.is_admin ? 'allowed' : 'signin');
  };

  useEffect(() => { checkSession(); }, []);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0B0F1A]">
        <Loader2 size={32} className="animate-spin text-[#4C6FFF]" />
      </div>
    );
  }

  if (status === 'recovery') return <SetNewPassword onSuccess={() => setStatus('allowed')} />;

  if (status === 'signin') {
    return <AdminSignIn onSuccess={() => setStatus('allowed')} />;
  }

  return <AdminPage />;
}

const el = document.getElementById('admin-root')!;
createRoot(el).render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>
);
