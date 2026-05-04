import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, Users, DollarSign, TrendingUp, ShieldCheck, MessageSquare,
  FileText, LogOut, Search, X, CheckCircle2, XCircle, Send, RefreshCw, Download,
  AlertCircle, Loader2, Eye, UserCheck, Wallet, Mail, Settings,
  Trash2, Edit2, Plus, Save, Copy, ExternalLink, Activity, Ban,
  MessageCircle, BarChart3, LogIn,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  adminGetAllTrades, adminGetAllTransactions as getAllTx,
  adminGetPendingKyc, adminGetAllChats, adminGetUserChats, adminSendChatMessage,
  adminMarkChatsRead, adminUpdatePlan, adminUpdateKyc,
  adminGetAllDepositAddresses, adminUpsertDepositAddress, adminDeleteDepositAddress, adminToggleDepositAddress,
  adminGetUserFull, adminUpdateTransactionStatus, adminSendEmail, adminBroadcastEmail,
  adminGetSettings, adminSetSetting, adminBlockUser, adminUnblockUser, adminAddNote,
  adminGetLogs, adminInsertLog, adminCancelTrade, adminDeleteUser, adminGetFullOverview,
  adminGetAllUsers, adminGetPendingTransactions, adminApproveTransaction,
} from '../lib/db';
import { adminService } from '../services/adminService';
import { cn } from '../components/wallet/shared';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type Section = 'overview' | 'users' | 'balances' | 'trades' | 'kyc' | 'requests' | 'email' | 'logs' | 'settings';

interface UserRow extends Record<string, unknown> {
  id: string; full_name: string | null; email?: string | null; phone?: string | null;
  country?: string | null; plan: string; created_at: string;
  is_suspended?: boolean; is_admin?: boolean; status?: string;
  wallets?: { usd: number; btc: number; eth: number; sol: number; usdt: number } | null;
  kyc?: { status: string } | null; admin_notes?: string | null;
}
interface ChatMsg { id: string; user_id: string; message: string; sender: 'user' | 'admin'; created_at: string; is_read: boolean; }

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const fmt = (n: number, d = 2) => n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
const planColor = (p: string) => p === 'elite' ? 'text-[#FFD700] bg-[#FFD700]/10 border-[#FFD700]/20' : p === 'pro' ? 'text-[#4C6FFF] bg-[#4C6FFF]/10 border-[#4C6FFF]/20' : 'text-[#9CA3AF] bg-white/5 border-white/10';
const kycColor = (s: string) => s === 'verified' ? 'text-[#00FFA3] bg-[#00FFA3]/10 border-[#00FFA3]/20' : s === 'pending' ? 'text-[#FBBF24] bg-[#FBBF24]/10 border-[#FBBF24]/20' : s === 'rejected' ? 'text-[#FF4D4D] bg-[#FF4D4D]/10 border-[#FF4D4D]/20' : 'text-[#6B7280] bg-white/5 border-white/10';
const txColor = (s: string) => s === 'completed' ? 'text-[#00FFA3] bg-[#00FFA3]/10 border-[#00FFA3]/20' : s === 'pending' ? 'text-[#FBBF24] bg-[#FBBF24]/10 border-[#FBBF24]/20' : 'text-[#FF4D4D] bg-[#FF4D4D]/10 border-[#FF4D4D]/20';
const statusColor = (s?: string) => !s || s === 'active' ? 'text-[#00FFA3] bg-[#00FFA3]/10 border-[#00FFA3]/20' : 'text-[#FF4D4D] bg-[#FF4D4D]/10 border-[#FF4D4D]/20';
function exportCsv(rows: Record<string, unknown>[], name: string) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n');
  const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv); a.download = name; a.click();
}
function copyText(t: string) { navigator.clipboard.writeText(t).catch(() => {}); }

// â”€â”€â”€ Nav â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const NAV: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview',      icon: <LayoutDashboard size={15} /> },
  { id: 'users',    label: 'Users',         icon: <Users size={15} /> },
  { id: 'balances', label: 'Balances',      icon: <DollarSign size={15} /> },
  { id: 'trades',   label: 'Trades',        icon: <TrendingUp size={15} /> },
  { id: 'kyc',      label: 'KYC Review',    icon: <ShieldCheck size={15} /> },
  { id: 'requests', label: 'Requests',       icon: <Wallet size={15} /> },
  { id: 'email',    label: 'Email Users',   icon: <Mail size={15} /> },
  { id: 'logs',     label: 'Activity Logs', icon: <FileText size={15} /> },
  { id: 'settings', label: 'Settings',      icon: <Settings size={15} /> },
];

// â”€â”€â”€ Shared UI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('bg-[#111827] border border-[#1F2937] rounded-2xl', className)}>{children}</div>;
}
function LblInput({ label, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return <div>{label && <label className="block text-xs text-[#9CA3AF] mb-1.5 font-medium">{label}</label>}<input {...p} className={cn('w-full bg-[#0B0F1A] border border-[#1F2937] text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#4C6FFF] placeholder-[#4B5563]', p.className)} /></div>;
}
function Btn({ children, variant = 'primary', loading, className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary'|'danger'|'ghost'|'success'|'warning'; loading?: boolean }) {
  const v = { primary: 'bg-[#4C6FFF] hover:bg-[#3a5cff] text-white', danger: 'bg-[#FF4D4D]/15 hover:bg-[#FF4D4D]/25 text-[#FF4D4D] border border-[#FF4D4D]/20', success: 'bg-[#00FFA3]/15 hover:bg-[#00FFA3]/25 text-[#00FFA3] border border-[#00FFA3]/20', ghost: 'bg-[#1F2937] hover:bg-[#374151] text-[#9CA3AF] hover:text-white', warning: 'bg-[#FBBF24]/15 hover:bg-[#FBBF24]/25 text-[#FBBF24] border border-[#FBBF24]/20' };
  return <button {...p} disabled={p.disabled || loading} className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed', v[variant], className)}>{loading && <Loader2 size={13} className="animate-spin" />}{children}</button>;
}
function Toast({ msg, onClose }: { msg: { type: 'success'|'error'; text: string }; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={cn('fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-medium', msg.type === 'success' ? 'bg-[#0B1F14] border-[#00FFA3]/30 text-[#00FFA3]' : 'bg-[#1F0B0B] border-[#FF4D4D]/30 text-[#FF4D4D]')}>{msg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}{msg.text}</motion.div>;
}
function useToast() {
  const [toast, setToast] = useState<{ type: 'success'|'error'; text: string } | null>(null);
  const show = useCallback((type: 'success'|'error', text: string) => setToast({ type, text }), []);
  const clear = useCallback(() => setToast(null), []);
  return { toast, show, clear };
}
function Shell({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <div className="p-6 max-w-7xl mx-auto"><div className="flex items-start justify-between mb-6"><div><h1 className="text-xl font-bold text-white">{title}</h1>{subtitle && <p className="text-sm text-[#9CA3AF] mt-0.5">{subtitle}</p>}</div>{action}</div>{children}</div>;
}
function PageLoader() { return <div className="flex items-center justify-center h-64"><Loader2 size={28} className="animate-spin text-[#4C6FFF]" /></div>; }
function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium border', className)}>{children}</span>;
}

// â”€â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function AdminPage() {
  const [section, setSection] = useState<Section>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="flex h-screen bg-[#0B0F1A] text-white overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/60 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — full on desktop, slide-in drawer on mobile */}
      <aside className={cn(
        'fixed md:relative z-30 md:z-auto h-full w-56 shrink-0 bg-[#111827] border-r border-[#1F2937] flex flex-col transition-transform duration-200',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}>
        <div className="p-5 border-b border-[#1F2937] flex items-center justify-between">
          <div>
            <p className="text-[#4C6FFF] font-bold text-lg">Vilox<span className="text-white">AI</span></p>
            <p className="text-[10px] text-[#9CA3AF] mt-0.5 uppercase tracking-widest">Admin Panel</p>
          </div>
          <button className="md:hidden p-1 text-[#9CA3AF]" onClick={() => setSidebarOpen(false)}><X size={16} /></button>
        </div>
        <nav className="flex-1 p-3 overflow-y-auto space-y-0.5">
          {NAV.map(n => (
            <button key={n.id} onClick={() => { setSection(n.id); setSidebarOpen(false); }}
              className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left',
                section === n.id ? 'bg-[#4C6FFF]/15 text-[#4C6FFF] border border-[#4C6FFF]/20' : 'text-[#9CA3AF] hover:text-white hover:bg-[#1F2937]')}>
              {n.icon}{n.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-[#1F2937]">
          <button onClick={() => supabase.auth.signOut().then(() => { window.location.href = '/admin.html'; })}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#FF4D4D] hover:bg-[#FF4D4D]/10 rounded-xl transition-colors">
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto min-w-0">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-[#0B0F1A] border-b border-[#1F2937] md:hidden">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl bg-[#111827] text-[#9CA3AF]">
            <BarChart3 size={16} />
          </button>
          <span className="font-semibold text-white text-sm">{NAV.find(n => n.id === section)?.label ?? 'Admin'}</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={section} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} className="h-full">
            {section === 'overview' && <OverviewSection />}
            {section === 'users'    && <UsersSection />}
            {section === 'balances' && <BalancesSection />}
            {section === 'trades'   && <TradesSection />}
            {section === 'kyc'      && <KycSection />}
            {section === 'requests' && <RequestsSection />}
            {section === 'email'    && <EmailSection />}
            {section === 'logs'     && <LogsSection />}
            {section === 'settings' && <SettingsSection />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// OVERVIEW
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function OverviewSection() {
  const [data, setData] = useState<Awaited<ReturnType<typeof adminGetFullOverview>> | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { adminGetFullOverview().then(setData).catch(console.error).finally(() => setLoading(false)); }, []);
  if (loading) return <PageLoader />;
  const stats = [
    { label: 'Total Users',    value: data?.totalUsers ?? 0,               icon: <Users size={20} />,         color: 'text-[#4C6FFF] bg-[#4C6FFF]/10' },
    { label: 'Active Today',   value: data?.activeUsersToday ?? 0,         icon: <Activity size={20} />,      color: 'text-[#00FFA3] bg-[#00FFA3]/10' },
    { label: 'Total Balance',  value: `$${fmt(data?.totalDeposits ?? 0)}`, icon: <DollarSign size={20} />,    color: 'text-[#FBBF24] bg-[#FBBF24]/10' },
    { label: 'Trades Today',   value: data?.tradesToday ?? 0,            icon: <TrendingUp size={20} />,    color: 'text-[#A78BFA] bg-[#A78BFA]/10' },
    { label: 'Pending KYC',    value: data?.pendingKyc ?? 0,             icon: <ShieldCheck size={20} />,   color: 'text-[#F97316] bg-[#F97316]/10' },
    { label: 'Unread Chats',   value: data?.unreadChats ?? 0,            icon: <MessageSquare size={20} />, color: 'text-[#EC4899] bg-[#EC4899]/10' },
  ];
  return (
    <Shell title="Overview" subtitle="Platform at a glance">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {stats.map(s => (
          <Card key={s.label} className="p-5 flex items-center gap-4">
            <div className={cn('p-3 rounded-xl', s.color)}>{s.icon}</div>
            <div><p className="text-2xl font-bold text-white">{s.value}</p><p className="text-xs text-[#9CA3AF]">{s.label}</p></div>
          </Card>
        ))}
      </div>
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1F2937]"><p className="font-semibold text-white text-sm">Recent Sign-ups (Last 10)</p></div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-[#1F2937] text-[10px] uppercase text-[#6B7280] tracking-wider">
            <th className="px-5 py-3 text-left">Name</th><th className="px-5 py-3 text-left">Email</th><th className="px-5 py-3 text-left">Plan</th><th className="px-5 py-3 text-left">Joined</th><th className="px-5 py-3 text-left">USD Balance</th>
          </tr></thead>
          <tbody className="divide-y divide-[#1F2937]/40">
            {(data?.recentSignups ?? []).map(u => (
              <tr key={u.id as string} className="hover:bg-[#1F2937]/20">
                <td className="px-5 py-3 font-medium text-white">{(u.full_name as string) || 'Unnamed'}</td>
                <td className="px-5 py-3 text-[#9CA3AF] text-xs">{(u.email as string) || '—'}</td>
                <td className="px-5 py-3"><Badge className={planColor(u.plan as string)}>{(u.plan as string) || 'starter'}</Badge></td>
                <td className="px-5 py-3 text-[#9CA3AF] text-xs">{u.created_at ? new Date(u.created_at as string).toLocaleDateString() : '—'}</td>
                <td className="px-5 py-3 font-mono text-xs text-white">${fmt(Number((u.wallets as Record<string,number> | null)?.usd ?? 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </Shell>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// USERS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function UsersSection() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [blockModal, setBlockModal] = useState<UserRow | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const { toast, show, clear } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try { 
      setUsers(await adminService.getAllUsers()); 
    } catch (e) { 
      console.error(e); 
      show('error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Subscribe to real-time admin updates
  useEffect(() => {
    const unsubscribe = adminService.subscribeToAdminUpdates(() => {
      // Data will be automatically refreshed by the service
    });

    // Subscribe to user updates from adminService
    const unsubscribeUsers = adminService.subscribe('users-updated', (users: UserRow[]) => {
      setUsers(users);
    });

    // Subscribe to operation updates
    const unsubscribeOps = adminService.subscribe('operation-completed', (operation: any) => {
      show('success', `Operation completed: ${operation.details}`);
    });

    const unsubscribeOpsFailed = adminService.subscribe('operation-failed', (operation: any) => {
      show('error', `Operation failed: ${operation.details}`);
    });

    return () => {
      unsubscribe();
      unsubscribeUsers();
      unsubscribeOps();
      unsubscribeOpsFailed();
    };
  }, [show]);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || (u.full_name ?? '').toLowerCase().includes(q) || String(u.email ?? '').toLowerCase().includes(q) || String(u.phone ?? '').toLowerCase().includes(q);
    const matchPlan = filterPlan === 'all' || u.plan === filterPlan;
    const matchStatus = filterStatus === 'all' || (u.status ?? 'active') === filterStatus;
    return matchSearch && matchPlan && matchStatus;
  });

  const handlePlan = async (userId: string, plan: string) => {
    setBusy(userId);
    try { await adminUpdatePlan(userId, plan); await adminInsertLog('update_plan', userId, plan); await load(); show('success', 'Plan updated'); } catch { show('error', 'Failed'); }
    setBusy(null);
  };
  const handleBlock = async () => {
    if (!blockModal || !blockReason.trim()) return;
    setBusy(blockModal.id);
    try { await adminBlockUser(blockModal.id, blockReason); await adminInsertLog('block_user', blockModal.id, blockReason); setBlockModal(null); setBlockReason(''); await load(); show('success', 'User blocked'); } catch (e: unknown) { show('error', (e as Error).message || 'Block failed'); }
    setBusy(null);
  };
  const handleUnblock = async (u: UserRow) => {
    setBusy(u.id);
    try { await adminUnblockUser(u.id); await adminInsertLog('unblock_user', u.id); await load(); show('success', 'User unblocked'); } catch (e: unknown) { show('error', (e as Error).message || 'Unblock failed'); }
    setBusy(null);
  };
  const handleDelete = async (u: UserRow) => {
    if (!confirm(`Permanently delete ${u.full_name}? This cannot be undone.`)) return;
    setBusy(u.id);
    try { await adminDeleteUser(u.id); await adminInsertLog('delete_user', u.id); await load(); show('success', 'User deleted'); } catch (e: unknown) { show('error', (e as Error).message); }
    setBusy(null);
  };

  const handleImpersonate = async (u: UserRow) => {
    if (!confirm(`Log in as ${u.full_name || u.email || 'this user'}?\n\nNote: The magic link will open in a new tab. Your admin session here remains active — the two sessions are separate.`)) return;
    setBusy(u.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const res = await supabase.functions.invoke('admin-impersonate', {
        body: { userId: u.id },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.error) throw new Error(res.error.message ?? 'Edge Function error');
      if (res.data?.error) throw new Error(res.data.error);
      if (!res.data?.url) throw new Error('No login URL returned — check admin-impersonate Edge Function logs');
      await adminInsertLog('impersonate_user', u.id, `Admin logged in as ${u.email ?? u.id}`);
      window.open(res.data.url, '_blank');
      show('success', `Opened session as ${u.full_name || u.email}`);
    } catch (e: unknown) { show('error', (e as Error).message); }
    setBusy(null);
  };

  if (loading) return <PageLoader />;
  return (
    <Shell title="Users" subtitle={`${users.length} total · ${filtered.length} shown`} action={
      <div className="flex gap-2">
        <Btn variant="ghost" onClick={() => adminService.exportUsers('csv').catch(() => show('error', 'Export failed'))}>
          <Download size={13} />Export CSV
        </Btn>
        <Btn variant="ghost" onClick={load}><RefreshCw size={13} />Refresh</Btn>
      </div>
    }>
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4B5563]" size={14} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, phone…" className="w-full bg-[#111827] border border-[#1F2937] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#4B5563] focus:outline-none focus:border-[#4C6FFF]" />
        </div>
        <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)} className="bg-[#111827] border border-[#1F2937] text-sm text-[#9CA3AF] rounded-xl px-3 py-2.5 focus:outline-none">
          <option value="all">All Plans</option><option value="starter">Starter</option><option value="pro">Pro</option><option value="elite">Elite</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-[#111827] border border-[#1F2937] text-sm text-[#9CA3AF] rounded-xl px-3 py-2.5 focus:outline-none">
          <option value="all">All Status</option><option value="active">Active</option><option value="blocked">Blocked</option>
        </select>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[#1F2937] text-[10px] uppercase tracking-wider text-[#6B7280]">
              <th className="px-4 py-3 text-left">User</th><th className="px-4 py-3 text-left">Email</th><th className="px-4 py-3 text-left">Plan</th><th className="px-4 py-3 text-left">KYC</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Balance</th><th className="px-4 py-3 text-left">Joined</th><th className="px-4 py-3 text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-[#1F2937]/40">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-[#1F2937]/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#4C6FFF]/20 flex items-center justify-center text-[#4C6FFF] text-xs font-bold shrink-0">{(u.full_name ?? 'U')[0].toUpperCase()}</div>
                      <p className="font-semibold text-white text-xs">{u.full_name || 'Unnamed'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#9CA3AF]">{String(u.email ?? '—')}</td>
                  <td className="px-4 py-3">
                    <select value={u.plan || 'starter'} onChange={e => handlePlan(u.id, e.target.value)} disabled={busy === u.id} className="bg-[#1F2937] border border-[#374151] text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none">
                      <option value="starter">Starter</option><option value="pro">Pro</option><option value="elite">Elite</option>
                    </select>
                  </td>
                  <td className="px-4 py-3"><Badge className={kycColor(String((u.kyc as Record<string,unknown> | null)?.status ?? 'none'))}>{String((u.kyc as Record<string,unknown> | null)?.status ?? 'none')}</Badge></td>
                  <td className="px-4 py-3"><Badge className={statusColor(u.status)}>{u.status ?? 'active'}</Badge></td>
                  <td className="px-4 py-3 font-mono text-xs text-white">${fmt(Number((u.wallets as Record<string,number> | null)?.usd ?? 0))}</td>
                  <td className="px-4 py-3 text-[#9CA3AF] text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button title="View Details" onClick={() => setSelected(u)} className="p-1.5 rounded-lg bg-[#4C6FFF]/10 text-[#4C6FFF] hover:bg-[#4C6FFF]/20"><Eye size={12} /></button>
                      <button title="Login as User" onClick={() => handleImpersonate(u)} disabled={busy === u.id} className="p-1.5 rounded-lg bg-[#00FFA3]/10 text-[#00FFA3] hover:bg-[#00FFA3]/20 disabled:opacity-50"><LogIn size={12} /></button>
                      {(!u.status || u.status === 'active') ? (
                        <button title="Block" onClick={() => setBlockModal(u)} disabled={busy === u.id} className="p-1.5 rounded-lg bg-[#FF4D4D]/10 text-[#FF4D4D] hover:bg-[#FF4D4D]/20 disabled:opacity-50"><Ban size={12} /></button>
                      ) : (
                        <button title="Unblock" onClick={() => handleUnblock(u)} disabled={busy === u.id} className="p-1.5 rounded-lg bg-[#00FFA3]/10 text-[#00FFA3] hover:bg-[#00FFA3]/20 disabled:opacity-50"><UserCheck size={12} /></button>
                      )}
                      <button title="Delete" onClick={() => handleDelete(u)} disabled={busy === u.id} className="p-1.5 rounded-lg bg-[#FF4D4D]/10 text-[#FF4D4D] hover:bg-[#FF4D4D]/20 disabled:opacity-50"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <AnimatePresence>
        {blockModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full max-w-sm bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-2xl">
              <h3 className="font-bold text-white mb-1">Block Account</h3>
              <p className="text-xs text-[#9CA3AF] mb-4">User: <strong className="text-white">{blockModal.full_name}</strong></p>
              <textarea value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="Reason for blocking…" rows={3} className="w-full bg-[#0B0F1A] border border-[#1F2937] text-white text-sm rounded-xl px-3 py-2.5 mb-4 focus:outline-none focus:border-[#FF4D4D] resize-none" />
              <div className="flex gap-2">
                <Btn variant="ghost" className="flex-1 justify-center" onClick={() => { setBlockModal(null); setBlockReason(''); }}>Cancel</Btn>
                <Btn variant="danger" className="flex-1 justify-center" onClick={handleBlock} loading={busy === blockModal.id} disabled={!blockReason.trim()}>Block User</Btn>
              </div>
            </motion.div>
          </div>
        )}
        {selected && (
          <motion.div
            key="user-detail-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <UserDetailModal user={selected} onClose={() => setSelected(null)} toast={show} reload={load} />
          </motion.div>
        )}
        {toast && <Toast msg={toast} onClose={clear} />}
      </AnimatePresence>
    </Shell>
  );
}

function UserDetailModal({ user, onClose, toast, reload }: { user: UserRow; onClose: () => void; toast: (t: 'success'|'error', m: string) => void; reload: () => void }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof adminGetUserFull>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'info'|'wallet'|'trades'|'txs'|'kyc'|'notes'>('info');
  const [note, setNote] = useState('');
  const [noteBusy, setNoteBusy] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const [emailSubj, setEmailSubj] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [balAsset, setBalAsset] = useState('usd');
  const [balAmount, setBalAmount] = useState('');
  const [balBusy, setBalBusy] = useState(false);

  useEffect(() => {
    setLoading(true);
    
    const loadUserData = async () => {
      try {
        // Try the full function first
        const data = await adminGetUserFull(user.id);
        setData(data);
        setNote(String((data.profile as Record<string,unknown>)?.admin_notes ?? ''));
      } catch (error) {
        console.warn('Full user data load failed, trying minimal:', error);
        try {
          // Fallback to minimal data
          const { adminGetUserMinimal } = await import('../lib/db');
          const minimalData = await adminGetUserMinimal(user.id);
          setData(minimalData);
          setNote(String((minimalData.profile as Record<string,unknown>)?.admin_notes ?? ''));
          toast('success', 'Loaded basic user info (some data may be unavailable)');
        } catch (minimalError) {
          console.error('Minimal user data load also failed:', minimalError);
          toast('error', `Failed to load user: ${minimalError instanceof Error ? minimalError.message : 'Unknown error'}`);
        }
      }
    };
    
    loadUserData().finally(() => setLoading(false));
  }, [user.id, toast]);

  const saveNote = async () => { setNoteBusy(true); try { await adminAddNote(user.id, note); toast('success', 'Note saved'); reload(); } catch { toast('error', 'Failed'); } setNoteBusy(false); };
  const sendEmail = async () => {
    if (!emailSubj || !emailBody || !user.email) return;
    setEmailBusy(true);
    try { await adminSendEmail(String(user.email), emailSubj, emailBody); toast('success', 'Email sent'); setEmailModal(false); } catch { toast('error', 'Failed — deploy admin-email Edge Function'); }
    setEmailBusy(false);
  };
  const adjustBalance = async () => {
    if (!balAmount) return;
    setBalBusy(true);
    try { 
      await adminService.adjustBalance(user.id, balAsset, Number(balAmount), 'Admin adjustment'); 
      toast('success', 'Balance adjusted'); 
      setBalAmount('');
      reload();
    } catch (e: unknown) { 
      toast('error', (e as Error).message); 
    }
    setBalBusy(false);
  };

  const p = data?.profile as Record<string, unknown> | null;
  const w = data?.wallet as Record<string, number> | null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-[#111827] border border-[#1F2937] rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-[#1F2937] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4C6FFF]/20 flex items-center justify-center text-[#4C6FFF] font-bold text-lg">{(user.full_name ?? 'U')[0].toUpperCase()}</div>
            <div><p className="font-bold text-white">{user.full_name || 'Unnamed'}</p><p className="text-xs text-[#6B7280] font-mono">{user.id}</p></div>
          </div>
          <div className="flex gap-2">
            <Btn variant="ghost" className="text-xs px-3 py-1.5" onClick={() => setEmailModal(true)}><Mail size={12} />Email</Btn>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#1F2937] text-[#9CA3AF]"><X size={15} /></button>
          </div>
        </div>
        <div className="flex border-b border-[#1F2937] shrink-0 overflow-x-auto">
          {(['info','wallet','trades','txs','kyc','notes'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={cn('flex-1 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition-colors whitespace-nowrap px-2', tab === t ? 'text-[#4C6FFF] border-b-2 border-[#4C6FFF]' : 'text-[#6B7280] hover:text-white')}>
              {t === 'txs' ? 'Transactions' : t}
            </button>
          ))}
        </div>
        <div className="overflow-y-auto flex-1 p-5">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={22} className="animate-spin text-[#4C6FFF]" />
            </div>
          ) : !data ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <AlertCircle size={48} className="text-[#FF4D4D] mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Failed to Load User Data</h3>
              <p className="text-sm text-[#9CA3AF] mb-4">There was an error loading this user's information. Please try again.</p>
              <button 
                onClick={() => {
                  setLoading(true);
                  
                  const loadUserData = async () => {
                    try {
                      const data = await adminGetUserFull(user.id);
                      setData(data);
                      setNote(String((data.profile as Record<string,unknown>)?.admin_notes ?? ''));
                    } catch (error) {
                      console.warn('Full user data load failed, trying minimal:', error);
                      try {
                        const { adminGetUserMinimal } = await import('../lib/db');
                        const minimalData = await adminGetUserMinimal(user.id);
                        setData(minimalData);
                        setNote(String((minimalData.profile as Record<string,unknown>)?.admin_notes ?? ''));
                        toast('success', 'Loaded basic user info (some data may be unavailable)');
                      } catch (minimalError) {
                        console.error('Minimal user data load also failed:', minimalError);
                        toast('error', `Failed to load user: ${minimalError instanceof Error ? minimalError.message : 'Unknown error'}`);
                      }
                    }
                  };
                  
                  loadUserData().finally(() => setLoading(false));
                }}
                className="px-4 py-2 bg-[#4C6FFF] text-white rounded-lg hover:bg-[#5B7FFF] transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              {tab === 'info' && (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    {([['Full Name', p?.full_name],['Email', p?.email ?? user.email],['Phone', p?.phone],['Country', p?.country],['Timezone', p?.timezone],['Plan', p?.plan],['Status', p?.status ?? 'active'],['Joined', p?.created_at ? new Date(String(p.created_at)).toLocaleString() : '—'],['Last Login', p?.last_login_at ? new Date(String(p.last_login_at)).toLocaleString() : '—'],['Login Count', p?.login_count]] as [string, unknown][]).map(([k, v]) => (
                      <div key={k} className="bg-[#0B0F1A] border border-[#1F2937] rounded-xl p-3"><p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1">{k}</p><p className="text-sm text-white">{String(v ?? '—')}</p></div>
                    ))}
                    <div className="col-span-2 bg-[#0B0F1A] border border-[#1F2937] rounded-xl p-3">
                      <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1">User ID</p>
                      <div className="flex items-center gap-2"><p className="text-xs text-white font-mono flex-1 break-all">{user.id}</p><button onClick={() => copyText(user.id)} className="text-[#4C6FFF]"><Copy size={11} /></button></div>
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">Adjust Balance</p>
                  <div className="flex gap-2 flex-wrap">
                    <select value={balAsset} onChange={e => setBalAsset(e.target.value)} className="bg-[#0B0F1A] border border-[#1F2937] text-white text-xs rounded-xl px-3 py-2 focus:outline-none">
                      {['usd','btc','eth','sol','usdt','xrp','bnb','ada','avax','doge','dot','matic','link','shib','trx','qnt','usdc','uni','atom','ltc','near','op','arb'].map(a => <option key={a} value={a}>{a.toUpperCase()}</option>)}
                    </select>
                    <input value={balAmount} onChange={e => setBalAmount(e.target.value)} type="number" placeholder="Amount (+/âˆ’)" className="bg-[#0B0F1A] border border-[#1F2937] text-white text-xs rounded-xl px-3 py-2 focus:outline-none w-36" />
                    <Btn className="text-xs px-3 py-2" onClick={adjustBalance} loading={balBusy} disabled={!balAmount}><DollarSign size={12} />Apply</Btn>
                  </div>
                </>
              )}
              {tab === 'wallet' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
                  {['usd','btc','eth','sol','usdt','xrp','bnb','ada','avax','doge','dot','matic','link','shib','trx','qnt','usdc','uni','atom','ltc','near','op','arb'].map(a => (
                    <div key={a} className="bg-[#0B0F1A] border border-[#1F2937] rounded-xl p-3">
                      <p className="text-[10px] text-[#6B7280] uppercase mb-1">{a}</p>
                      <p className="font-mono font-bold text-white text-sm">{fmt(Number(w?.[a] ?? 0), a === 'shib' ? 0 : 8)}</p>
                    </div>
                  ))}
                </div>
              )}
              {tab === 'trades' && (
                <div className="space-y-2">
                  {(data?.trades ?? []).map((t: Record<string,unknown>) => (
                    <div key={t.id as string} className="bg-[#0B0F1A] border border-[#1F2937] rounded-xl px-4 py-3 flex gap-3 items-center text-xs">
                      <span className={cn('font-bold w-8', String(t.side) === 'BUY' ? 'text-[#00FFA3]' : 'text-[#FF4D4D]')}>{String(t.side)}</span>
                      <span className="font-semibold text-white">{String(t.symbol)}</span>
                      <span className="text-[#9CA3AF] flex-1">{fmt(Number(t.amount), 4)} @ ${fmt(Number(t.price))}</span>
                      <Badge className={txColor(String(t.status ?? 'filled'))}>{String(t.status ?? 'filled')}</Badge>
                    </div>
                  ))}
                  {!data?.trades?.length && <p className="text-center text-[#6B7280] text-sm py-8">No trades.</p>}
                </div>
              )}
              {tab === 'txs' && (
                <div className="space-y-2">
                  {(data?.transactions ?? []).map((tx: Record<string,unknown>) => <TxRowModal key={tx.id as string} tx={tx} />)}
                  {!data?.transactions?.length && <p className="text-center text-[#6B7280] text-sm py-8">No transactions.</p>}
                </div>
              )}
              {tab === 'kyc' && (
                <div className="space-y-3">
                  {data?.kyc ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        {(['status','doc_type','submitted_at','rejection_reason'] as const).map(k => (
                          <div key={k} className="bg-[#0B0F1A] border border-[#1F2937] rounded-xl p-3">
                            <p className="text-[10px] text-[#6B7280] uppercase mb-1">{k.replace(/_/g,' ')}</p>
                            <p className="text-sm text-white">{String((data.kyc as Record<string,unknown>)[k] ?? '—')}</p>
                          </div>
                        ))}
                      </div>
                      {(data.kyc as Record<string,unknown>).doc_url && <a href={String((data.kyc as Record<string,unknown>).doc_url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-[#4C6FFF]"><ExternalLink size={13} />View Document</a>}
                      {(data.kyc as Record<string,unknown>).selfie_url && <a href={String((data.kyc as Record<string,unknown>).selfie_url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-[#4C6FFF] ml-4"><ExternalLink size={13} />View Selfie</a>}
                    </>
                  ) : <p className="text-center text-[#6B7280] text-sm py-8">No KYC submitted.</p>}
                </div>
              )}
              {tab === 'notes' && (
                <div className="space-y-3">
                  <label className="block text-xs text-[#9CA3AF] mb-1.5">Private admin notes (not visible to user)</label>
                  <textarea value={note} onChange={e => setNote(e.target.value)} rows={6} className="w-full bg-[#0B0F1A] border border-[#1F2937] text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#4C6FFF] resize-none" />
                  <Btn onClick={saveNote} loading={noteBusy}><Save size={13} />Save Note</Btn>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {emailModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full max-w-md bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-white">Send Email to {user.full_name}</h3><button onClick={() => setEmailModal(false)}><X size={15} className="text-[#6B7280]" /></button></div>
              <div className="space-y-3">
                <LblInput label="Subject" value={emailSubj} onChange={e => setEmailSubj(e.target.value)} placeholder="e.g. Important account notice" />
                <div><label className="block text-xs text-[#9CA3AF] mb-1.5">Message</label><textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={5} className="w-full bg-[#0B0F1A] border border-[#1F2937] text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#4C6FFF] resize-none" /></div>
                <Btn onClick={sendEmail} loading={emailBusy} disabled={!emailSubj || !emailBody || !user.email} className="w-full justify-center"><Send size={13} />Send Email</Btn>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TxRowModal({ tx }: { tx: Record<string, unknown> }) {
  const [st, setSt] = useState(String(tx.status ?? 'pending'));
  return (
    <div className="bg-[#0B0F1A] border border-[#1F2937] rounded-xl px-4 py-3 flex gap-3 items-center text-xs">
      <span className="capitalize text-white font-semibold w-16">{String(tx.type)}</span>
      <span className="font-mono text-[#9CA3AF] uppercase w-12">{String(tx.asset)}</span>
      <span className="font-mono flex-1">{fmt(Number(tx.amount))}</span>
      <select value={st} onChange={async e => { const v = e.target.value as 'pending'|'completed'|'failed'; setSt(v); await adminUpdateTransactionStatus(String(tx.id), v).catch(() => {}); }} className="bg-[#1F2937] border border-[#374151] text-white text-xs rounded-lg px-2 py-1 focus:outline-none">
        <option value="pending">Pending</option><option value="completed">Completed</option><option value="failed">Failed</option>
      </select>
      <span className="text-[#6B7280]">{new Date(String(tx.created_at)).toLocaleDateString()}</span>
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// BALANCES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function BalancesSection() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [asset, setAsset] = useState('usd');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [recentAdj, setRecentAdj] = useState<Record<string, unknown>[]>([]);
  const { toast, show, clear } = useToast();

  useEffect(() => { adminGetAllUsers().then(r => setUsers(r as UserRow[])).catch(console.error); }, []);
  useEffect(() => {
    supabase.from('admin_logs').select('*, profiles:target_user_id(full_name)').eq('action', 'BALANCE_ADJUSTMENT').order('created_at', { ascending: false }).limit(20).then(({ data }) => setRecentAdj((data ?? []) as Record<string, unknown>[]));
  }, [busy]);

  const usersFiltered = users.filter(u => String(u.full_name ?? '').toLowerCase().includes(search.toLowerCase()) || String(u.email ?? '').toLowerCase().includes(search.toLowerCase()));

  const handleAdjust = async () => {
    if (!selectedUser || !amount) return;
    setBusy(true);
    try {
      await adminService.adjustBalance(selectedUser.id, asset, Number(amount), 'Admin adjustment');
      await adminInsertLog('adjust_balance', selectedUser.id, `${asset} ${amount}`);
      show('success', `Balance updated for ${selectedUser.full_name}`);
      setAmount('');
    } catch (e: unknown) { show('error', (e as Error).message); }
    setBusy(false);
  };

  return (
    <Shell title="Balances" subtitle="Credit or debit any user balance">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-5 space-y-4">
          <p className="font-semibold text-sm text-white">Adjust User Balance</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4B5563]" size={13} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search user…" className="w-full bg-[#0B0F1A] border border-[#1F2937] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#4B5563] focus:outline-none focus:border-[#4C6FFF]" />
            <AnimatePresence>
              {search && usersFiltered.length > 0 && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute z-20 top-full mt-1 w-full bg-[#1F2937] border border-[#374151] rounded-xl shadow-xl max-h-44 overflow-y-auto">
                  {usersFiltered.map(u => (
                    <button key={u.id} onClick={() => { setSelectedUser(u); setSearch(''); }} className="w-full flex gap-3 items-center px-4 py-2.5 text-sm hover:bg-[#374151] text-left">
                      <div className="w-7 h-7 rounded-full bg-[#4C6FFF]/20 flex items-center justify-center text-[#4C6FFF] text-xs font-bold shrink-0">{(u.full_name ?? 'U')[0].toUpperCase()}</div>
                      <div><p className="text-white text-xs font-medium">{u.full_name || 'Unnamed'}</p><p className="text-[#6B7280] text-[10px]">{String(u.email ?? '')}</p></div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {selectedUser && (
            <div className="flex items-center gap-2 bg-[#4C6FFF]/10 border border-[#4C6FFF]/20 rounded-xl px-4 py-2.5">
              <Wallet size={14} className="text-[#4C6FFF]" /><span className="text-sm font-medium flex-1 text-white">{selectedUser.full_name}</span>
              <button onClick={() => setSelectedUser(null)}><X size={13} className="text-[#6B7280]" /></button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-[#9CA3AF] mb-1.5">Asset</label><select value={asset} onChange={e => setAsset(e.target.value)} className="w-full bg-[#0B0F1A] border border-[#1F2937] text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none">{['usd','btc','eth','sol','usdt'].map(a => <option key={a} value={a}>{a.toUpperCase()}</option>)}</select></div>
            <LblInput label="Amount (+/âˆ’)" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 500" />
          </div>
          <Btn onClick={handleAdjust} loading={busy} disabled={!selectedUser || !amount} className="w-full justify-center py-3"><DollarSign size={14} />Confirm Adjustment</Btn>
        </Card>
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1F2937]"><p className="font-semibold text-sm text-white">Recent Adjustments</p></div>
          <div className="divide-y divide-[#1F2937]/40 max-h-80 overflow-y-auto">
            {!recentAdj.length && <p className="text-center text-[#6B7280] text-sm py-8">No adjustments yet.</p>}
            {recentAdj.map(r => (
              <div key={String(r.id)} className="px-5 py-3 flex justify-between items-center text-xs">
                <div><p className="text-white font-medium">{String(((r.profiles as Record<string,unknown>)?.full_name) ?? '—')}</p><p className="text-[#6B7280] max-w-xs truncate">{String(r.details ?? '')}</p></div>
                <div className="text-right text-[#6B7280]">{new Date(String(r.created_at)).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <AnimatePresence>{toast && <Toast msg={toast} onClose={clear} />}</AnimatePresence>
    </Shell>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TRADES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function TradesSection() {
  const [trades, setTrades] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSide, setFilterSide] = useState('all');
  const [busy, setBusy] = useState<string | null>(null);
  const { toast, show, clear } = useToast();

  const load = useCallback(() => { setLoading(true); adminGetAllTrades().then(setTrades).catch(console.error).finally(() => setLoading(false)); }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = trades.filter(t => {
    const q = search.toLowerCase();
    const match = !q || String(t.symbol ?? '').toLowerCase().includes(q) || String((t.profiles as Record<string,unknown>)?.full_name ?? '').toLowerCase().includes(q);
    const side = filterSide === 'all' || t.side === filterSide;
    return match && side;
  });

  const cancelTrade = async (id: string) => {
    setBusy(id);
    try { await adminCancelTrade(id); await adminInsertLog('cancel_trade', undefined, id); show('success', 'Trade cancelled'); load(); } catch { show('error', 'Failed'); }
    setBusy(null);
  };

  if (loading) return <PageLoader />;
  return (
    <Shell title="Trades" subtitle={`${trades.length} total`} action={
      <div className="flex gap-2">
        <select value={filterSide} onChange={e => setFilterSide(e.target.value)} className="bg-[#111827] border border-[#1F2937] text-sm text-[#9CA3AF] rounded-xl px-3 py-2 focus:outline-none"><option value="all">All Sides</option><option value="BUY">BUY</option><option value="SELL">SELL</option></select>
        <Btn variant="ghost" onClick={() => exportCsv(filtered, 'trades.csv')}><Download size={13} />CSV</Btn>
      </div>
    }>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4B5563]" size={14} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter by symbol or user…" className="w-full max-w-sm bg-[#111827] border border-[#1F2937] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#4B5563] focus:outline-none focus:border-[#4C6FFF]" />
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[#1F2937] text-[10px] uppercase tracking-wider text-[#6B7280]">
              <th className="px-4 py-3 text-left">User</th><th className="px-4 py-3 text-left">Symbol</th><th className="px-4 py-3 text-left">Side</th><th className="px-4 py-3 text-left">Amount</th><th className="px-4 py-3 text-left">Price</th><th className="px-4 py-3 text-left">Total</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-right">Action</th>
            </tr></thead>
            <tbody className="divide-y divide-[#1F2937]/40">
              {filtered.map(t => (
                <tr key={String(t.id)} className="hover:bg-[#1F2937]/20">
                  <td className="px-4 py-3 text-[#9CA3AF] text-xs">{String((t.profiles as Record<string,unknown>)?.full_name ?? '—')}</td>
                  <td className="px-4 py-3 font-bold text-white">{String(t.symbol)}</td>
                  <td className="px-4 py-3"><span className={cn('font-semibold', String(t.side) === 'BUY' ? 'text-[#00FFA3]' : 'text-[#FF4D4D]')}>{String(t.side)}</span></td>
                  <td className="px-4 py-3 font-mono text-xs">{fmt(Number(t.amount), 6)}</td>
                  <td className="px-4 py-3 font-mono text-xs">${fmt(Number(t.price))}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-xs">${fmt(Number(t.total ?? Number(t.amount) * Number(t.price)))}</td>
                  <td className="px-4 py-3"><Badge className={txColor(String(t.status ?? 'filled'))}>{String(t.status ?? 'filled')}</Badge></td>
                  <td className="px-4 py-3 text-[#9CA3AF] text-xs">{new Date(String(t.created_at)).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    {String(t.status) !== 'cancelled' && (
                      <button onClick={() => cancelTrade(String(t.id))} disabled={busy === String(t.id)} className="text-xs text-[#FF4D4D] hover:underline disabled:opacity-50">
                        {busy === String(t.id) ? <Loader2 size={12} className="animate-spin" /> : 'Cancel'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <AnimatePresence>{toast && <Toast msg={toast} onClose={clear} />}</AnimatePresence>
    </Shell>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// KYC
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function KycSection() {
  const [pending, setPending] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<Record<string, unknown> | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const { toast, show, clear } = useToast();

  const load = useCallback(() => { setLoading(true); adminGetPendingKyc().then(setPending).catch(console.error).finally(() => setLoading(false)); }, []);
  useEffect(() => { load(); }, [load]);

  const approve = async (userId: string) => {
    setBusy(userId);
    try { await adminUpdateKyc(userId, 'verified'); await adminInsertLog('approve_kyc', userId); show('success', 'KYC approved'); load(); } catch { show('error', 'Failed'); }
    setBusy(null);
  };
  const reject = async (userId: string) => {
    if (!rejectReason) return;
    setBusy(userId);
    try { await adminUpdateKyc(userId, 'rejected', rejectReason); await adminInsertLog('reject_kyc', userId, rejectReason); show('success', 'KYC rejected'); setReviewing(null); setRejectReason(''); load(); } catch { show('error', 'Failed'); }
    setBusy(null);
  };

  if (loading) return <PageLoader />;
  return (
    <Shell title="KYC Review" subtitle={`${pending.length} pending verifications`} action={<Btn variant="ghost" onClick={load}><RefreshCw size={13} />Refresh</Btn>}>
      {!pending.length ? (
        <div className="flex flex-col items-center justify-center py-24 text-[#6B7280]">
          <CheckCircle2 size={44} className="text-[#00FFA3] mb-3 opacity-70" />
          <p className="font-semibold text-white">All clear — no pending KYC</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map(k => (
            <Card key={String(k.id)} className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white">{String((k.profiles as Record<string,unknown>)?.full_name ?? 'Unknown')}</p>
                <p className="text-xs text-[#9CA3AF] mt-0.5">Doc: {String(k.doc_type ?? '—')} · Submitted: {k.submitted_at ? new Date(String(k.submitted_at)).toLocaleDateString() : '—'}</p>
                {k.doc_url ? <a href={String(k.doc_url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-[#4C6FFF] mt-1 hover:underline"><ExternalLink size={11} />View Document</a> : null}
                {k.selfie_url ? <a href={String(k.selfie_url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-[#4C6FFF] mt-1 ml-3 hover:underline"><ExternalLink size={11} />Selfie</a> : null}
              </div>
              <div className="flex gap-2 shrink-0">
                <Btn variant="success" onClick={() => approve(String(k.user_id))} loading={busy === String(k.user_id)}><CheckCircle2 size={13} />Approve</Btn>
                <Btn variant="danger" onClick={() => setReviewing(k)}><XCircle size={13} />Reject</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}
      <AnimatePresence>
        {reviewing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full max-w-sm bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-2xl">
              <h3 className="font-bold text-white mb-4">Reject KYC — {String((reviewing.profiles as Record<string,unknown>)?.full_name ?? '')}</h3>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Enter rejection reason…" rows={3} className="w-full bg-[#0B0F1A] border border-[#1F2937] text-white text-sm rounded-xl px-3 py-2.5 mb-4 focus:outline-none focus:border-[#FF4D4D] resize-none" />
              <div className="flex gap-2">
                <Btn variant="ghost" className="flex-1 justify-center" onClick={() => { setReviewing(null); setRejectReason(''); }}>Cancel</Btn>
                <Btn variant="danger" className="flex-1 justify-center" onClick={() => reject(String(reviewing.user_id))} loading={busy === String(reviewing.user_id)} disabled={!rejectReason}>Confirm Reject</Btn>
              </div>
            </motion.div>
          </div>
        )}
        {toast && <Toast msg={toast} onClose={clear} />}
      </AnimatePresence>
    </Shell>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// REQUESTS (Deposits & Withdrawals)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function RequestsSection() {
  const [requests, setRequests] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const { toast, show, clear } = useToast();

  const load = () => {
    setLoading(true);
    adminGetPendingTransactions()
      .then(r => setRequests(r))
      .catch(() => show('error', 'Failed to load requests'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handle = async (txId: string, decision: 'approve' | 'reject') => {
    setBusy(txId + decision);
    try {
      await adminApproveTransaction(txId, decision);
      show('success', decision === 'approve' ? 'Request approved âœ“' : 'Request rejected');
      setRequests(prev => prev.filter(r => r.id !== txId));
    } catch (e: unknown) {
      show('error', (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Shell title="Deposit & Withdrawal Requests" subtitle="Approve or reject pending user requests">
      <AnimatePresence>{toast && <Toast msg={toast} onClose={clear} />}</AnimatePresence>
      <div className="flex justify-end mb-4">
        <Btn variant="ghost" onClick={load} loading={loading}><RefreshCw size={13} /> Refresh</Btn>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-[#9CA3AF]">
          <Loader2 size={18} className="animate-spin" /> Loading requests…
        </div>
      ) : requests.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle2 size={32} className="mx-auto mb-3 text-[#00FFA3] opacity-50" />
          <p className="text-[#9CA3AF] text-sm">No pending requests</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map(r => {
            const profile = r.profiles as Record<string, unknown> | null;
            const type = String(r.type ?? '');
            const asset = String(r.asset ?? '').toUpperCase();
            const amount = Number(r.amount ?? 0);
            const fee = Number(r.fee ?? 0);
            const notes = String(r.notes ?? '');
            const createdAt = new Date(r.created_at as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            const isDeposit = type === 'deposit';
            return (
              <Card key={r.id as string} className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDeposit ? 'bg-[#00FFA3]/10 text-[#00FFA3]' : 'bg-[#FF4D4D]/10 text-[#FF4D4D]'}`}>
                      {isDeposit ? <DollarSign size={18} /> : <TrendingUp size={18} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded border ${isDeposit ? 'text-[#00FFA3] bg-[#00FFA3]/10 border-[#00FFA3]/20' : 'text-[#FF4D4D] bg-[#FF4D4D]/10 border-[#FF4D4D]/20'}`}>
                          {isDeposit ? 'Deposit' : 'Withdrawal'}
                        </span>
                        <span className="text-white font-bold">{amount.toFixed(asset === 'USD' ? 2 : 6)} {asset}</span>
                        {fee > 0 && <span className="text-[#6B7280] text-xs">Fee: {fee.toFixed(asset === 'USD' ? 2 : 6)}</span>}
                      </div>
                      <p className="text-[#9CA3AF] text-xs mt-0.5 truncate">
                        {String(profile?.full_name ?? 'Unknown')} · {String(profile?.email ?? '')}
                      </p>
                      {notes && <p className="text-[#6B7280] text-xs mt-0.5 truncate">{notes}</p>}
                      <p className="text-[#4B5563] text-xs mt-0.5">{createdAt}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Btn
                      variant="success"
                      loading={busy === (r.id as string) + 'approve'}
                      disabled={!!busy}
                      onClick={() => handle(r.id as string, 'approve')}
                    >
                      <CheckCircle2 size={13} /> Approve
                    </Btn>
                    <Btn
                      variant="danger"
                      loading={busy === (r.id as string) + 'reject'}
                      disabled={!!busy}
                      onClick={() => handle(r.id as string, 'reject')}
                    >
                      <XCircle size={13} /> Reject
                    </Btn>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Shell>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// EMAIL USERS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const EMAIL_TEMPLATES = [
  { name: 'Welcome', subject: 'Welcome to ViloxAI!', body: 'Hi there,\n\nWelcome to ViloxAI! We\'re excited to have you on board.\n\nStart exploring our AI-powered trading tools today.\n\nBest,\nThe ViloxAI Team' },
  { name: 'Maintenance', subject: 'Scheduled Maintenance Notice', body: 'Dear user,\n\nWe will be performing scheduled maintenance. The platform may be temporarily unavailable.\n\nWe apologize for any inconvenience.\n\nBest,\nThe ViloxAI Team' },
  { name: 'KYC Reminder', subject: 'Complete Your KYC Verification', body: 'Dear user,\n\nTo unlock full access to ViloxAI, please complete your KYC verification in your profile settings.\n\nBest,\nThe ViloxAI Team' },
];

function EmailSection() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [recipientMode, setRecipientMode] = useState<'all'|'pro'|'elite'|'starter'|'single'>('all');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const { toast, show, clear } = useToast();

  useEffect(() => { adminGetAllUsers().then(r => setUsers(r as UserRow[])).catch(console.error); }, []);

  const usersFiltered = users.filter(u => String(u.full_name ?? '').toLowerCase().includes(search.toLowerCase()) || String(u.email ?? '').toLowerCase().includes(search.toLowerCase()));

  const send = async () => {
    if (!subject || !body) { show('error', 'Subject and body required'); return; }
    setBusy(true);
    try {
      if (recipientMode === 'single') {
        if (!selectedUser?.email) { show('error', 'No email for selected user'); setBusy(false); return; }
        await adminSendEmail(String(selectedUser.email), subject, body);
        show('success', `Email sent to ${selectedUser.full_name}`);
      } else {
        await adminBroadcastEmail(subject, body);
        show('success', `Broadcast sent`);
      }
      setSubject(''); setBody('');
    } catch { show('error', 'Failed — deploy admin-email Edge Function first'); }
    setBusy(false);
  };

  return (
    <Shell title="Email Users" subtitle="Send emails via Edge Function">
      <div className="max-w-2xl space-y-5">
        <div>
          <p className="text-xs text-[#9CA3AF] font-medium mb-2">Recipients</p>
          <div className="flex flex-wrap gap-2">
            {(['all','pro','elite','starter','single'] as const).map(m => (
              <button key={m} onClick={() => setRecipientMode(m)} className={cn('px-4 py-2 rounded-xl text-xs font-medium border transition-colors', recipientMode === m ? 'bg-[#4C6FFF]/15 text-[#4C6FFF] border-[#4C6FFF]/30' : 'bg-[#111827] text-[#9CA3AF] border-[#1F2937] hover:text-white')}>
                {m === 'all' ? 'All Users' : m === 'single' ? 'Single User' : `${m[0].toUpperCase()}${m.slice(1)} Plan`}
              </button>
            ))}
          </div>
        </div>
        {recipientMode === 'single' && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4B5563]" size={13} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search user by name or email…" className="w-full bg-[#111827] border border-[#1F2937] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#4B5563] focus:outline-none focus:border-[#4C6FFF]" />
            <AnimatePresence>
              {search && usersFiltered.length > 0 && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute z-20 top-full mt-1 w-full bg-[#1F2937] border border-[#374151] rounded-xl shadow-xl max-h-44 overflow-y-auto">
                  {usersFiltered.map(u => <button key={u.id} onClick={() => { setSelectedUser(u); setSearch(''); }} className="w-full flex gap-3 items-center px-4 py-2.5 text-sm hover:bg-[#374151] text-left"><div className="w-7 h-7 rounded-full bg-[#4C6FFF]/20 flex items-center justify-center text-[#4C6FFF] text-xs font-bold shrink-0">{(u.full_name ?? 'U')[0].toUpperCase()}</div><div><p className="text-white text-xs font-medium">{u.full_name}</p><p className="text-[10px] text-[#6B7280]">{String(u.email ?? '')}</p></div></button>)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        {recipientMode === 'single' && selectedUser && (
          <div className="flex items-center gap-2 bg-[#4C6FFF]/10 border border-[#4C6FFF]/20 rounded-xl px-4 py-2.5">
            <Mail size={14} className="text-[#4C6FFF]" /><span className="text-sm text-white font-medium flex-1">{selectedUser.full_name}</span><span className="text-xs text-[#6B7280]">{String(selectedUser.email ?? '')}</span>
            <button onClick={() => setSelectedUser(null)}><X size={13} className="text-[#6B7280]" /></button>
          </div>
        )}
        <div>
          <p className="text-xs text-[#9CA3AF] font-medium mb-2">Quick Templates</p>
          <div className="flex gap-2">{EMAIL_TEMPLATES.map(t => <button key={t.name} onClick={() => { setSubject(t.subject); setBody(t.body); }} className="px-3 py-1.5 text-xs bg-[#1F2937] border border-[#374151] text-[#9CA3AF] hover:text-white hover:border-[#4C6FFF] rounded-lg transition-colors">{t.name}</button>)}</div>
        </div>
        <Card className="p-5 space-y-4">
          <LblInput label="Subject" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject…" />
          <div><label className="block text-xs text-[#9CA3AF] mb-1.5">Message Body</label><textarea value={body} onChange={e => setBody(e.target.value)} rows={8} className="w-full bg-[#0B0F1A] border border-[#1F2937] text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#4C6FFF] resize-none" /></div>
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => setPreview(!preview)}><Eye size={13} />{preview ? 'Hide' : 'Preview'}</Btn>
            <Btn onClick={send} loading={busy} disabled={!subject || !body} className="flex-1 justify-center py-3"><Send size={14} />Send Email</Btn>
          </div>
          {preview && subject && body && (
            <div className="bg-[#0B0F1A] border border-[#1F2937] rounded-xl p-4">
              <p className="text-xs text-[#6B7280] mb-2">Subject: <span className="text-white">{subject}</span></p>
              <p className="text-sm text-[#D1D5DB] whitespace-pre-wrap">{body}</p>
            </div>
          )}
        </Card>
        <div className="bg-[#FBBF24]/10 border border-[#FBBF24]/20 rounded-xl p-4 text-xs text-[#FBBF24]">
          <p className="font-semibold mb-1">âš ï¸ Edge Function required</p>
          <p>Deploy a Supabase Edge Function named <code className="bg-black/30 px-1 rounded">admin-email</code> to enable email sending.</p>
        </div>
      </div>
      <AnimatePresence>{toast && <Toast msg={toast} onClose={clear} />}</AnimatePresence>
    </Shell>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ACTIVITY LOGS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function LogsSection() {
  const [logs, setLogs] = useState<Record<string, unknown>[]>([]);
  const [txLogs, setTxLogs] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'admin'|'transactions'>('admin');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([adminGetLogs(), getAllTx()]).then(([a, t]) => {
      setLogs(a as Record<string, unknown>[]);
      setTxLogs(t as Record<string, unknown>[]);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filteredLogs = logs.filter(l => !search || String(l.action ?? '').toLowerCase().includes(search.toLowerCase()));
  const filteredTx = txLogs.filter(t => {
    const q = search.toLowerCase();
    return !q || String((t.profiles as Record<string,unknown>)?.full_name ?? '').toLowerCase().includes(q) || String(t.type ?? '').includes(q) || String(t.status ?? '').includes(q);
  });

  if (loading) return <PageLoader />;
  return (
    <Shell title="Activity Logs" subtitle="Admin actions and transaction history" action={
      <Btn variant="ghost" onClick={() => exportCsv(tab === 'transactions' ? filteredTx : filteredLogs, tab === 'transactions' ? 'transactions.csv' : 'admin_logs.csv')}>
        <Download size={13} />Export CSV
      </Btn>
    }>
      <div className="flex gap-2 mb-4">
        {(['admin','transactions'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={cn('px-4 py-2 rounded-xl text-sm font-medium border transition-colors', tab === t ? 'bg-[#4C6FFF]/15 text-[#4C6FFF] border-[#4C6FFF]/30' : 'bg-[#111827] text-[#9CA3AF] border-[#1F2937]')}>
            {t === 'admin' ? 'Admin Actions' : 'Transactions'}
          </button>
        ))}
      </div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4B5563]" size={14} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter…" className="w-full max-w-sm bg-[#111827] border border-[#1F2937] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#4B5563] focus:outline-none focus:border-[#4C6FFF]" />
      </div>
      {tab === 'admin' && (
        <Card className="overflow-hidden">
          {!filteredLogs.length ? (
            <div className="py-16 text-center">
              <p className="text-[#6B7280] text-sm mb-2">No admin logs found.</p>
              <p className="text-[#4B5563] text-xs">Create the table in Supabase to enable logging:</p>
              <pre className="mt-3 mx-auto max-w-lg text-left bg-[#0B0F1A] rounded-xl p-3 text-[10px] text-[#00FFA3] overflow-x-auto">{`CREATE TABLE IF NOT EXISTS public.admin_logs (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  admin_id UUID REFERENCES auth.users(id),\n  action TEXT NOT NULL,\n  target_user_id UUID REFERENCES auth.users(id),\n  details TEXT,\n  created_at TIMESTAMPTZ DEFAULT NOW()\n);`}</pre>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-[#1F2937] text-[10px] uppercase tracking-wider text-[#6B7280]">
                  <th className="px-5 py-3 text-left">Action</th><th className="px-5 py-3 text-left">Target User</th><th className="px-5 py-3 text-left">Details</th><th className="px-5 py-3 text-left">Date</th>
                </tr></thead>
                <tbody className="divide-y divide-[#1F2937]/40">
                  {filteredLogs.map(l => (
                    <tr key={String(l.id)} className="hover:bg-[#1F2937]/20">
                      <td className="px-5 py-3 font-medium text-white capitalize">{String(l.action ?? '').replace(/_/g, ' ')}</td>
                      <td className="px-5 py-3 text-[#9CA3AF] text-xs font-mono">{l.target_user_id ? String(l.target_user_id).slice(0, 12) + '…' : '—'}</td>
                      <td className="px-5 py-3 text-[#9CA3AF] text-xs max-w-xs truncate">{String(l.details ?? '—')}</td>
                      <td className="px-5 py-3 text-[#9CA3AF] text-xs">{new Date(String(l.created_at)).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
      {tab === 'transactions' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#1F2937] text-[10px] uppercase tracking-wider text-[#6B7280]">
                <th className="px-4 py-3 text-left">User</th><th className="px-4 py-3 text-left">Type</th><th className="px-4 py-3 text-left">Asset</th><th className="px-4 py-3 text-left">Amount</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Update</th><th className="px-4 py-3 text-left">Date</th>
              </tr></thead>
              <tbody className="divide-y divide-[#1F2937]/40">
                {filteredTx.map(l => <TxLogRow key={String(l.id)} l={l} />)}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </Shell>
  );
}

function TxLogRow({ l }: { l: Record<string, unknown> }) {
  const [st, setSt] = useState(String(l.status ?? 'pending'));
  return (
    <tr className="hover:bg-[#1F2937]/20">
      <td className="px-4 py-3 text-[#9CA3AF] text-xs">{String((l.profiles as Record<string,unknown>)?.full_name ?? '—')}</td>
      <td className="px-4 py-3 text-white capitalize text-xs">{String(l.type ?? '')}</td>
      <td className="px-4 py-3 font-mono text-xs text-[#9CA3AF]">{String(l.asset ?? '').toUpperCase()}</td>
      <td className="px-4 py-3 font-mono font-semibold text-xs">{fmt(Number(l.amount))}</td>
      <td className="px-4 py-3"><Badge className={txColor(st)}>{st}</Badge></td>
      <td className="px-4 py-3">
        <select value={st} onChange={async e => { const v = e.target.value as 'pending'|'completed'|'failed'; setSt(v); await adminUpdateTransactionStatus(String(l.id), v).catch(() => {}); }} className="bg-[#1F2937] border border-[#374151] text-white text-xs rounded-lg px-2 py-1 focus:outline-none">
          <option value="pending">Pending</option><option value="completed">Completed</option><option value="failed">Failed</option>
        </select>
      </td>
      <td className="px-4 py-3 text-[#9CA3AF] text-xs">{new Date(String(l.created_at)).toLocaleDateString()}</td>
    </tr>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SETTINGS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function SettingsSection() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [addrTab, setAddrTab] = useState(false);
  const { toast, show, clear } = useToast();

  const PLATFORM_KEYS = [
    { key: 'site_name',           label: 'Site Name',                placeholder: 'ViloxAI' },
    { key: 'support_email',       label: 'Support Email',            placeholder: 'support@viloxai.com' },
    { key: 'trading_fee_pct',     label: 'Trading Fee %',            placeholder: '0.5' },
    { key: 'withdrawal_fee_pct',  label: 'Withdrawal Fee %',         placeholder: '0.5' },
    { key: 'max_withdrawal_usd',  label: 'Max Daily Withdrawal $',   placeholder: '10000' },
    { key: 'min_deposit_usd',     label: 'Min Deposit $',            placeholder: '10' },
    { key: 'maintenance_mode',    label: 'Maintenance Mode',         placeholder: 'false' },
    { key: 'ai_signal_threshold', label: 'AI Signal Threshold %',    placeholder: '70' },
    { key: 'referral_reward_usd', label: 'Referral Reward $',        placeholder: '10' },
    { key: 'starter_profit_pct',  label: 'Starter Daily Profit %',   placeholder: '0.5' },
    { key: 'pro_profit_pct',      label: 'Pro Daily Profit %',       placeholder: '1.5' },
    { key: 'elite_profit_pct',    label: 'Elite Daily Profit %',     placeholder: '3.0' },
  ];

  const load = useCallback(() => {
    setLoading(true);
    adminGetSettings().then(rows => {
      const m: Record<string,string> = {};
      for (const r of rows) m[(r as Record<string,string>).key] = (r as Record<string,string>).value;
      setSettings(m);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setBusy(true);
    try { await Promise.all(Object.entries(settings).map(([k, v]) => adminSetSetting(k, v))); show('success', 'Settings saved'); } catch { show('error', 'Failed — create site_settings table first'); }
    setBusy(false);
  };

  if (loading) return <PageLoader />;
  return (
    <Shell title="Platform Settings">
      <div className="max-w-2xl space-y-5">
        <div className="flex gap-2 mb-2">
          <button onClick={() => setAddrTab(false)} className={cn('px-4 py-2 rounded-xl text-sm font-medium border transition-colors', !addrTab ? 'bg-[#4C6FFF]/15 text-[#4C6FFF] border-[#4C6FFF]/30' : 'bg-[#111827] text-[#9CA3AF] border-[#1F2937]')}>Platform Config</button>
          <button onClick={() => setAddrTab(true)}  className={cn('px-4 py-2 rounded-xl text-sm font-medium border transition-colors', addrTab  ? 'bg-[#4C6FFF]/15 text-[#4C6FFF] border-[#4C6FFF]/30' : 'bg-[#111827] text-[#9CA3AF] border-[#1F2937]')}>Deposit Addresses</button>
        </div>
        {!addrTab ? (
          <>
            <Card className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {PLATFORM_KEYS.map(({ key, label, placeholder }) => (
                  <LblInput key={key} label={label} value={settings[key] ?? ''} onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))} placeholder={placeholder} />
                ))}
              </div>
              <div className="mt-5 flex gap-3">
                <Btn onClick={save} loading={busy} className="px-8"><Save size={13} />Save All Settings</Btn>
                <Btn variant="ghost" onClick={load}><RefreshCw size={13} />Reload</Btn>
              </div>
            </Card>
            <div className="bg-[#4C6FFF]/10 border border-[#4C6FFF]/20 rounded-xl p-4 text-xs text-[#9CA3AF]">
              <p className="font-semibold text-white mb-2">Required SQL (run in Supabase SQL Editor):</p>
              <pre className="bg-[#0B0F1A] rounded-xl p-3 text-[#00FFA3] overflow-x-auto text-[10px]">{`CREATE TABLE IF NOT EXISTS public.site_settings (\n  key TEXT PRIMARY KEY,\n  value TEXT,\n  updated_at TIMESTAMPTZ DEFAULT NOW()\n);\n\nALTER TABLE profiles\n  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',\n  ADD COLUMN IF NOT EXISTS admin_notes TEXT,\n  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,\n  ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ,\n  ADD COLUMN IF NOT EXISTS blocked_reason TEXT;\n\nCREATE TABLE IF NOT EXISTS public.admin_logs (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  admin_id UUID REFERENCES auth.users(id),\n  action TEXT NOT NULL,\n  target_user_id UUID REFERENCES auth.users(id),\n  details TEXT,\n  created_at TIMESTAMPTZ DEFAULT NOW()\n);`}</pre>
            </div>
          </>
        ) : <AddressesSubSection toast={show} />}
      </div>
      <AnimatePresence>{toast && <Toast msg={toast} onClose={clear} />}</AnimatePresence>
    </Shell>
  );
}

function AddressesSubSection({ toast }: { toast: (t: 'success'|'error', m: string) => void }) {
  const [addrs, setAddrs] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; editing: Record<string, unknown> | null }>({ open: false, editing: null });
  const [form, setForm] = useState({ symbol: '', address: '', network: '', min_deposit: '' });
  const [busy, setBusy] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminGetAllDepositAddresses()
      .then(setAddrs)
      .catch((e: unknown) => toast('error', (e as Error).message || 'Failed to load addresses'))
      .finally(() => setLoading(false));
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setForm({ symbol: '', address: '', network: '', min_deposit: '' });
    setModal({ open: true, editing: null });
  };
  const openEdit = (r: Record<string, unknown>) => {
    setForm({ symbol: String(r.symbol), address: String(r.address), network: String(r.network ?? ''), min_deposit: String(r.min_deposit ?? '') });
    setModal({ open: true, editing: r });
  };
  const closeModal = () => setModal({ open: false, editing: null });

  const save = async () => {
    if (!form.symbol || !form.address) return;
    setBusy(true);
    try {
      await adminUpsertDepositAddress({ symbol: form.symbol, address: form.address, network: form.network || undefined, min_deposit: form.min_deposit || undefined });
      toast('success', `${form.symbol.toUpperCase()} address saved`);
      closeModal();
      load();
    } catch (e: unknown) { toast('error', (e as Error).message || 'Save failed'); }
    setBusy(false);
  };

  const toggle = async (r: Record<string, unknown>) => {
    const sym = String(r.symbol);
    setToggling(sym);
    try {
      await adminToggleDepositAddress(sym, !r.is_active);
      load();
    } catch (e: unknown) { toast('error', (e as Error).message || 'Toggle failed'); }
    setToggling(null);
  };

  const del = async (r: Record<string, unknown>) => {
    const sym = String(r.symbol);
    if (!confirm(`Delete ${sym}? Users won't be able to deposit this coin.`)) return;
    try { await adminDeleteDepositAddress(sym); toast('success', `${sym} deleted`); load(); }
    catch (e: unknown) { toast('error', (e as Error).message || 'Delete failed'); }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#9CA3AF]">{addrs.length} address{addrs.length !== 1 ? 'es' : ''} configured</p>
        <Btn onClick={openAdd}><Plus size={13} />Add Address</Btn>
      </div>

      {!addrs.length && (
        <Card className="p-8 text-center text-[#6B7280] text-sm">No deposit addresses yet. Click Add Address to get started.</Card>
      )}

      {addrs.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1F2937] text-[10px] uppercase tracking-wider text-[#6B7280]">
                  <th className="px-4 py-3 text-left">Symbol</th>
                  <th className="px-4 py-3 text-left">Network</th>
                  <th className="px-4 py-3 text-left">Address</th>
                  <th className="px-4 py-3 text-left">Min Deposit</th>
                  <th className="px-4 py-3 text-center">Active</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2937]/40">
                {addrs.map(a => (
                  <tr key={String(a.symbol)} className="hover:bg-[#1F2937]/20 transition-colors">
                    <td className="px-4 py-3 font-bold text-white">{String(a.symbol)}</td>
                    <td className="px-4 py-3 text-xs text-[#9CA3AF]">{String(a.network ?? '—')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-[#9CA3AF] truncate max-w-[180px]">{String(a.address)}</span>
                        <button onClick={() => { copyText(String(a.address)); toast('success', 'Copied!'); }} className="text-[#4C6FFF] hover:text-[#6B8FFF] shrink-0"><Copy size={11} /></button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#9CA3AF]">{a.min_deposit ? String(a.min_deposit) : '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggle(a)}
                        disabled={toggling === String(a.symbol)}
                        className={cn('relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50',
                          a.is_active ? 'bg-[#00FFA3]' : 'bg-[#374151]')}
                      >
                        <span className={cn('inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform', a.is_active ? 'translate-x-4.5' : 'translate-x-0.5')} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg bg-[#4C6FFF]/10 text-[#4C6FFF] hover:bg-[#4C6FFF]/20"><Edit2 size={12} /></button>
                        <button onClick={() => del(a)} className="p-1.5 rounded-lg bg-[#FF4D4D]/10 text-[#FF4D4D] hover:bg-[#FF4D4D]/20"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {modal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full max-w-md bg-[#111827] border border-[#1F2937] rounded-2xl shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-bold text-white">{modal.editing ? `Edit ${form.symbol}` : 'Add Deposit Address'}</p>
                <button onClick={closeModal} className="p-2 rounded-xl hover:bg-[#1F2937] text-[#9CA3AF]"><X size={15} /></button>
              </div>
              <div className="space-y-3">
                <LblInput
                  label="Symbol (e.g. BTC, USDT)"
                  value={form.symbol}
                  onChange={e => setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))}
                  placeholder="BTC"
                  disabled={!!modal.editing}
                />
                <LblInput
                  label="Network (e.g. Bitcoin Network, TRC-20)"
                  value={form.network}
                  onChange={e => setForm(f => ({ ...f, network: e.target.value }))}
                  placeholder="Bitcoin Network"
                />
                <LblInput
                  label="Wallet Address"
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="0x… or T… or bc1…"
                />
                <LblInput
                  label="Min Deposit (optional)"
                  value={form.min_deposit}
                  onChange={e => setForm(f => ({ ...f, min_deposit: e.target.value }))}
                  placeholder="0.001"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Btn variant="ghost" className="flex-1 justify-center" onClick={closeModal}>Cancel</Btn>
                <Btn className="flex-1 justify-center" onClick={save} loading={busy} disabled={!form.symbol || !form.address}>
                  <Save size={13} />Save Address
                </Btn>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
