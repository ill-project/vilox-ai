import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowDownLeft, ArrowUpRight, ArrowRightLeft } from 'lucide-react';
import { Card, Badge, cn } from './shared';
import { useAuth } from '../../context/AuthContext';
import { getUserTransactions } from '../../lib/db';
import { supabase } from '../../lib/supabase';

type TxType = 'Deposit' | 'Withdraw' | 'Trade';
type Status = 'Completed' | 'Pending' | 'Failed';

interface Transaction {
  id: string;
  type: TxType;
  asset: string;
  amount: string;
  fee: string;
  status: Status;
  date: string;
}

// Mock fallback removed — show empty state when no real transactions exist

function capitalise(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

function mapDbStatus(s: string): Status {
  if (s === 'completed') return 'Completed';
  if (s === 'failed') return 'Failed';
  return 'Pending';
}

function mapDbType(t: string): TxType {
  if (t === 'withdraw') return 'Withdraw';
  if (t === 'transfer') return 'Trade';
  return 'Deposit';
}

function Skeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <tr key={i} className="border-b border-[#1F2937]/50">
          {Array.from({ length: 6 }).map((_, j) => (
            <td key={j} className="px-6 py-4">
              <div className="animate-pulse h-4 bg-[#1F2937] rounded w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function TransactionTable() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'All' | TxType>('All');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const mapRow = (r: Record<string, unknown>): Transaction => ({
    id: r.id as string,
    type: mapDbType(r.type as string),
    asset: (r.asset as string).toUpperCase(),
    amount: Number(r.amount).toLocaleString(undefined, { minimumFractionDigits: 2 }),
    fee: Number(r.fee).toLocaleString(undefined, { minimumFractionDigits: 2 }),
    status: mapDbStatus(r.status as string),
    date: new Date(r.created_at as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  });

  const fetchTxs = useCallback(() => {
    if (!user) return;
    getUserTransactions(user.id)
      .then(rows => {
        setTransactions(rows && rows.length > 0 ? rows.map(r => mapRow(r as Record<string, unknown>)) : []);
      })
      .catch(() => setTransactions([]))
      .finally(() => setIsLoading(false));
  }, [user]);

  useEffect(() => {
    if (!user) { setTransactions([]); setIsLoading(false); return; }

    setIsLoading(true);
    fetchTxs();

    // Realtime: INSERT adds new row, UPDATE does a full refetch to ensure latest status
    const channel = supabase
      .channel(`transactions-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const newTx = mapRow(payload.new as Record<string, unknown>);
          setTransactions(prev =>
            prev.some(t => t.id === newTx.id) ? prev : [newTx, ...prev]
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` },
        () => { fetchTxs(); }
      )
      .subscribe();

    // Refetch when tab becomes visible again (catches missed realtime events across tabs)
    const onVisible = () => { if (document.visibilityState === 'visible') fetchTxs(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user, fetchTxs]);

  const filtered = transactions.filter(tx => filter === 'All' || tx.type === filter);

  const getTypeIcon = (type: TxType) => {
    switch (type) {
      case 'Deposit': return <ArrowDownLeft size={16} className="text-[#00FFA3]" />;
      case 'Withdraw': return <ArrowUpRight size={16} className="text-[#FF4D4D]" />;
      case 'Trade': return <ArrowRightLeft size={16} className="text-[#4F7CFF]" />;
    }
  };

  const getStatusBadge = (status: Status, type: TxType) => {
    switch (status) {
      case 'Completed': return <Badge variant="success">Completed</Badge>;
      case 'Pending': return (
        <Badge variant="warning" className="animate-pulse">
          {type === 'Withdraw' ? 'Processing' : 'Pending'}
        </Badge>
      );
      case 'Failed': return <Badge variant="error">Failed</Badge>;
    }
  };

  return (
    <Card className="flex flex-col h-full border-[#1F2937] bg-gradient-to-b from-[#111827] to-[#0E1628]">
      <div className="p-6 border-b border-[#1F2937]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl font-semibold text-white tracking-tight">Transaction History</h2>
          <div className="flex bg-[#0B0F1A] rounded-lg p-1 border border-[#1F2937]">
            {['All', 'Deposit', 'Withdraw', 'Trade'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab as any)}
                className={cn(
                  "px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
                  filter === tab
                    ? "bg-[#1F2937] text-white shadow-sm"
                    : "text-[#9CA3AF] hover:text-white hover:bg-[#1F2937]/50"
                )}
              >
                {tab === 'Deposit' ? 'Deposits' : tab === 'Withdraw' ? 'Withdrawals' : tab === 'Trade' ? 'Trades' : 'All'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#1F2937] bg-[#0B0F1A]/50 text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Asset</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Fee</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Date</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <Skeleton />
            ) : (
              <AnimatePresence>
                {filtered.length === 0 ? (
                  <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <td colSpan={6} className="px-6 py-12 text-center text-[#9CA3AF]">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-[#1F2937]/50 flex items-center justify-center">
                          <ArrowRightLeft size={24} className="text-[#9CA3AF]/50" />
                        </div>
                        <p>No transactions yet</p>
                      </div>
                    </td>
                  </motion.tr>
                ) : (
                  filtered.map((tx, i) => (
                    <motion.tr
                      key={tx.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, delay: i * 0.05 }}
                      className="border-b border-[#1F2937]/50 hover:bg-[#1F2937]/20 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#0B0F1A] flex items-center justify-center border border-[#1F2937] group-hover:border-[#4F7CFF]/50 transition-colors">
                            {getTypeIcon(tx.type)}
                          </div>
                          <span className="font-medium text-white">{tx.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-white">{tx.asset}</td>
                      <td className="px-6 py-4 font-semibold text-white">{tx.amount}</td>
                      <td className="px-6 py-4 text-[#9CA3AF] text-sm">{tx.fee}</td>
                      <td className="px-6 py-4">{getStatusBadge(tx.status, tx.type)}</td>
                      <td className="px-6 py-4 text-right text-[#9CA3AF] text-sm whitespace-nowrap">{tx.date}</td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
