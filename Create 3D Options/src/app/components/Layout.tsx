import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router';
import { Activity, LayoutDashboard, LogOut, BarChart2, Bot, X, Wallet, Settings, Menu, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './Card3D';
import { signOut } from '../lib/auth';
import { useAuth } from '../context/AuthContext';
import { getUserProfile } from '../lib/db';
import { supabase } from '../lib/supabase';


const NAV_ITEMS = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/markets', icon: BarChart2, label: 'Markets' },
  { to: '/app/ai-trading-lab', icon: Bot, label: 'AI Trading Lab' },
  { to: '/app/wallet', icon: Wallet, label: 'Wallet' },
  { to: '/app/settings', icon: Settings, label: 'Settings' },
];

function FloatingAI() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="absolute bottom-16 right-0 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-indigo-400" />
                <span className="font-semibold text-white">Vilox AI Assistant</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 h-64 overflow-y-auto flex flex-col gap-3">
              <div className="bg-slate-800 rounded-lg p-3 text-sm text-slate-300 self-start max-w-[85%]">
                Hello! I'm observing the markets. BTC is showing strong momentum today. Would you like a portfolio analysis?
              </div>
            </div>
            <div className="p-3 border-t border-slate-700 bg-slate-800/30">
              <input
                type="text"
                placeholder="Ask Vilox AI..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 rounded-full flex items-center justify-center text-white shadow-lg shadow-indigo-500/30"
      >
        <Bot className="w-6 h-6" />
      </motion.button>
    </div>
  );
}

function TxNotification({ msg, onClose }: { msg: { type: 'success' | 'error'; text: string }; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 6000); return () => clearTimeout(t); }, [onClose]);
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        'fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-medium',
        msg.type === 'success'
          ? 'bg-[#0B1F14] border-[#00FFA3]/30 text-[#00FFA3]'
          : 'bg-[#1F0B0B] border-[#FF4D4D]/30 text-[#FF4D4D]'
      )}
    >
      {msg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
      {msg.text}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><X size={13} /></button>
    </motion.div>
  );
}

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true'; } catch { return false; }
  });
  const [profile, setProfile] = useState<{ full_name: string | null; plan: string } | null>(null);
  const [txNotif, setTxNotif] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const clearNotif = useCallback(() => setTxNotif(null), []);
  const isAuthPage = location.pathname === '/sign-in' || location.pathname === '/get-started' || location.pathname === '/sign-up';

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('sidebar-collapsed', String(next)); } catch {}
      return next;
    });
  };

  useEffect(() => {
    if (!user) return;
    const fetchProfile = () => {
      getUserProfile(user.id)
        .then(p => setProfile({ full_name: p?.full_name ?? null, plan: p?.plan ?? 'starter' }))
        .catch(() => {});
    };
    fetchProfile();
    // Re-fetch whenever a plan upgrade completes (fired by UpgradePage)
    window.addEventListener('vilox:planUpgraded', fetchProfile);
    return () => window.removeEventListener('vilox:planUpgraded', fetchProfile);
  }, [user]);

  // Global realtime: notify user when a deposit/withdrawal is approved or rejected
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`layout-tx-notify-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const tx = payload.new as Record<string, unknown>;
          const type = String(tx.type ?? '');
          const asset = String(tx.asset ?? '').toUpperCase();
          const amount = Number(tx.amount ?? 0);
          const label = type === 'deposit' ? 'Deposit' : type === 'withdraw' ? 'Withdrawal' : null;
          if (!label) return;
          if (tx.status === 'completed') {
            setTxNotif({ type: 'success', text: `${label} of ${amount.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${asset} approved!` });
          } else if (tx.status === 'failed') {
            setTxNotif({ type: 'error', text: `${label} of ${amount.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${asset} was rejected.` });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
        <Outlet />
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (_) {
      // ignore sign-out errors
    } finally {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 selection:bg-[#4C6FFF]/30 text-slate-50 flex relative">
      {/* Transaction approval/rejection notifications */}
      <AnimatePresence>
        {txNotif && <TxNotification msg={txNotif} onClose={clearNotif} />}
      </AnimatePresence>
      {/* Ambient Lighting */}
      <div className="fixed top-0 left-1/4 w-[50vw] h-[50vh] bg-[#4C6FFF]/5 rounded-full blur-[150px] -z-10 pointer-events-none mix-blend-screen" />

      {/* ─── Mobile: Top Header ─── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#4C6FFF]/20 flex items-center justify-center border border-[#4C6FFF]/50 shadow-[0_0_15px_rgba(76,111,255,0.3)]">
            <Activity className="text-[#4C6FFF] w-4 h-4" />
          </div>
          <span className="text-lg font-bold text-white">Vilox<span className="text-[#4C6FFF]">AI</span></span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* ─── Mobile: Hamburger Overlay ─── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed top-[57px] left-0 w-full z-40 bg-slate-950/95 backdrop-blur-xl border-b border-white/10 shadow-2xl overflow-y-auto"
            style={{ maxHeight: 'calc(100vh - 57px)' }}
          >
            <div className="flex flex-col p-4 space-y-2">
              <div className="text-xs text-white/40 font-mono tracking-widest uppercase mb-2 px-3 pt-2">Menu</div>
              {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 px-4 py-4 rounded-xl transition-colors',
                    isActive
                      ? 'bg-[#4C6FFF]/15 text-[#4C6FFF] border border-[#4C6FFF]/30 shadow-[0_0_15px_rgba(76,111,255,0.15)]'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-base font-medium">{label}</span>
                </NavLink>
              ))}

              {/* User profile + actions */}
              <div className="mt-4 pt-4 border-t border-white/10 space-y-1">
                <div className="flex items-center gap-3 px-4 py-2">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4C6FFF] to-[#6C3BFF] flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {profile?.full_name ? profile.full_name.slice(0, 2).toUpperCase() : user?.email?.slice(0, 2).toUpperCase() ?? '??'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{profile?.full_name ?? user?.email ?? 'User'}</p>
                    <p className="text-xs text-slate-400 truncate capitalize">{profile?.plan ?? 'Starter'} Plan</p>
                  </div>
                </div>
                <NavLink
                  to="/app/upgrade"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-4 rounded-xl text-[#FFD700] hover:bg-[#FFD700]/10 transition-colors"
                >
                  <Zap className="w-5 h-5 shrink-0 text-[#FFD700]" style={{ filter: 'drop-shadow(0 0 6px #FFD700)' }} />
                  <span className="text-base font-semibold">
                    {profile?.plan?.toLowerCase() === 'elite' ? 'Manage Plan' : 'Upgrade Plan'}
                  </span>
                </NavLink>
                <button
                  onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-4 rounded-xl text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-colors w-full"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-base font-medium">Log Out</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Desktop: Sidebar Navigation ─── */}
      <motion.nav
        animate={{ width: collapsed ? 72 : 256 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="hidden md:flex border-r border-slate-800 bg-slate-950/50 backdrop-blur-xl flex-col fixed h-full z-40 overflow-hidden"
        style={{ width: collapsed ? 72 : 256 }}
      >
        {/* Logo + collapse toggle */}
        <div className={cn('p-4 flex items-center', collapsed ? 'justify-center' : 'justify-between')}>
          {!collapsed && (
            <div className="flex items-center gap-2 text-xl font-bold text-white">
              <Activity className="w-6 h-6 text-[#4C6FFF] shrink-0" />
              Vilox <span className="text-[#4C6FFF]">AI</span>
            </div>
          )}
          {collapsed && <Activity className="w-6 h-6 text-[#4C6FFF]" />}
          <button
            onClick={toggleCollapsed}
            className={cn(
              'p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors border border-white/10',
              collapsed && 'mt-2'
            )}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex-1 px-2 space-y-1 overflow-y-auto overflow-x-hidden">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative',
                collapsed ? 'justify-center' : '',
                isActive
                  ? 'bg-[#4C6FFF]/15 text-[#4C6FFF] shadow-[0_0_12px_rgba(76,111,255,0.25)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              )}
              title={collapsed ? label : undefined}
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('w-5 h-5 shrink-0 transition-colors', isActive ? 'text-[#4C6FFF]' : 'text-slate-400 group-hover:text-slate-200')} />
                  <AnimatePresence initial={false}>
                    {!collapsed && (
                      <motion.span
                        key="label"
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.18 }}
                        className="font-medium whitespace-nowrap overflow-hidden"
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </>
              )}
            </NavLink>
          ))}
        </div>

        <div className="p-2 border-t border-slate-800 space-y-1">
          {/* User profile */}
          <div className={cn('flex items-center gap-3 px-3 py-2', collapsed && 'justify-center')}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4C6FFF] to-[#6C3BFF] flex items-center justify-center text-xs font-bold text-white shadow-inner shrink-0">
              {profile?.full_name ? profile.full_name.slice(0, 2).toUpperCase() : user?.email?.slice(0, 2).toUpperCase() ?? '??'}
            </div>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  key="user-info"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex-1 min-w-0 overflow-hidden"
                >
                  <p className="text-sm font-medium text-white truncate">{profile?.full_name ?? user?.email ?? 'User'}</p>
                  <p className="text-xs text-slate-400 truncate capitalize">{profile?.plan ?? 'Starter'} Plan</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {/* Upgrade / Manage Plan button — always visible */}
          <NavLink
            to="/app/upgrade"
            title={collapsed ? (profile?.plan?.toLowerCase() === 'elite' ? 'Manage Plan' : 'Upgrade Plan') : undefined}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-3 w-full rounded-xl transition-all',
              collapsed && 'justify-center',
              isActive
                ? 'bg-[#FFD700]/10 text-[#FFD700]'
                : 'text-[#FFD700] hover:bg-[#FFD700]/10'
            )}
            style={{ boxShadow: 'none' }}
          >
            <Zap className="w-5 h-5 shrink-0 text-[#FFD700]" style={{ filter: 'drop-shadow(0 0 6px #FFD700)' }} />
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.span
                  key="upgrade-label"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.18 }}
                  className="font-semibold whitespace-nowrap overflow-hidden text-[#FFD700]"
                >
                  {profile?.plan?.toLowerCase() === 'elite' ? 'Manage Plan' : 'Upgrade Plan'}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
          <button
            onClick={handleLogout}
            title={collapsed ? 'Log Out' : undefined}
            className={cn(
              'flex items-center gap-3 px-3 py-3 w-full rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all',
              collapsed && 'justify-center'
            )}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.span
                  key="logout-label"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.18 }}
                  className="font-medium whitespace-nowrap overflow-hidden"
                >
                  Log Out
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.nav>

      {/* Main Content — margin tracks sidebar width on desktop only */}
      <main
        className={cn(
          'flex-1 pt-[57px] md:pt-0 relative overflow-x-hidden min-h-screen transition-[margin] duration-300',
          collapsed ? 'md:ml-[72px]' : 'md:ml-[256px]'
        )}
      >
        <div className="absolute top-[-20%] left-[20%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
        <Outlet />
      </main>



      {/* Tawk.to chat widget replaces FloatingAI and LiveChat */}
    </div>
  );
}
