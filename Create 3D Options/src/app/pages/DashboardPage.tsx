import React, { useMemo, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import {
  TrendingUp, TrendingDown, Wallet, Bot, BarChart2, ArrowUpRight, ArrowDownLeft,
  Zap, ChevronRight, Activity, ShieldCheck,
  CircleDollarSign, Cpu, Clock, AlertTriangle,
} from 'lucide-react';
import { useGlobalContext } from '../context/GlobalContext';
import { AssetLogo } from '../components/AssetLogo';
import { useAuth } from '../context/AuthContext';
import { useMarketData } from '../hooks/useMarketData';
import { useSignals } from '../hooks/useSignals';
import { MOCK_STRATEGIES } from '../mockData';
import { getUserTransactions } from '../lib/db';
import { DepositModal, WithdrawModal } from '../components/wallet/Modals';

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const fmt = (n: number, digits = 2) =>
  n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });

const fmtCompact = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(2)}M`
    : n >= 1_000
    ? `$${(n / 1_000).toFixed(2)}K`
    : `$${fmt(n)}`;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const ASSET_PRICES_FALLBACK = { BTC: 65000, ETH: 3450, SOL: 145, USDT: 1 };
const CRYPTO_SYMBOLS = new Set(['BTC','ETH','SOL','XRP','BNB','ADA','AVAX','DOGE','DOT','MATIC','LINK','SHIB','TRX','QNT','USDT','USDC','UNI','ATOM','LTC','NEAR','OP','ARB']);

// â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function StatCard({
  label, value, sub, icon: Icon, trend, delay = 0,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; trend?: 'up' | 'down' | 'neutral'; delay?: number;
}) {
  const trendColor = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-white/40';
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="bg-[#0F111A] border border-white/8 rounded-2xl p-5 flex gap-4 items-start hover:border-[#4C6FFF]/30 transition-colors"
    >
      <div className="w-10 h-10 rounded-xl bg-[#4C6FFF]/10 border border-[#4C6FFF]/20 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-[#4C6FFF]" />
      </div>
      <div className="min-w-0 overflow-hidden">
        <p className="text-[10px] md:text-xs text-white/40 uppercase tracking-widest mb-1 leading-tight">{label}</p>
        <p className="text-sm md:text-xl font-bold text-white leading-tight break-words">{value}</p>
        {sub && <p className={`text-[10px] md:text-xs mt-0.5 break-words ${trendColor}`}>{sub}</p>}
      </div>
    </motion.div>
  );
}

function SignalBadge({ action }: { action: string }) {
  const cfg: Record<string, string> = {
    'STRONG BUY': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'BUY':        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'HOLD':       'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    'SELL':       'bg-red-500/10 text-red-400 border-red-500/20',
    'STRONG SELL':'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${cfg[action] ?? cfg['HOLD']}`}>
      {action}
    </span>
  );
}

function MiniSparkline({ positive }: { positive: boolean }) {
  // Simple decorative SVG sparkline
  const points = positive
    ? '0,18 8,15 16,12 24,14 32,8 40,6 48,9 56,4 64,2'
    : '0,2 8,5 16,4 24,8 32,7 40,12 48,10 56,15 64,18';
  return (
    <svg viewBox="0 0 64 20" className="w-16 h-5 opacity-60" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={positive ? '#34d399' : '#f87171'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// â”€â”€ Main Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { wallet, walletLoading, activeStrategies } = useGlobalContext();
  const prices = useMarketData();
  const { signals, isLoading: signalsLoading } = useSignals();

  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  // Derive live prices with fallbacks
  const btcPrice  = prices['BTC']?.price  ?? ASSET_PRICES_FALLBACK.BTC;
  const ethPrice  = prices['ETH']?.price  ?? ASSET_PRICES_FALLBACK.ETH;
  const solPrice  = prices['SOL']?.price  ?? ASSET_PRICES_FALLBACK.SOL;
  const btc24h    = prices['BTC']?.change24h ?? 2.4;
  const eth24h    = prices['ETH']?.change24h ?? -0.8;

  const usdBal    = wallet ? Number(wallet.usd)  : 0;
  const btcBal    = wallet ? Number(wallet.btc)  : 0;
  const ethBal    = wallet ? Number(wallet.eth)  : 0;
  const solBal    = wallet ? Number(wallet.sol)  : 0;
  const usdtBal   = wallet ? Number(wallet.usdt) : 0;

  const cryptoValue = btcBal * btcPrice + ethBal * ethPrice + solBal * solPrice + usdtBal;
  const totalValue  = usdBal + cryptoValue;

  // Weighted 24h change: (BTC value * btc24h + ETH value * eth24h) / totalValue
  const change24h = totalValue > 0
    ? ((btcBal * btcPrice * btc24h + ethBal * ethPrice * eth24h) / totalValue)
    : 0;
  const change24hUSD = totalValue * (change24h / 100);

  const topSignals = useMemo(() => signals.slice(0, 5), [signals]);

  // Load real trades from transactions table (type='transfer', notes='BUY/SELL N SYMBOL')
  const [recentTrades, setRecentTrades] = useState<Array<{ id: string; symbol: string; type: 'BUY' | 'SELL'; amount: number; price: number; date: string }>>([]);
  useEffect(() => {
    if (!user) return;
    getUserTransactions(user.id).then((rows) => {
      const STOCK_SYMBOLS = new Set(['AAPL','NVDA','TSLA','MSFT','GOOGL','AMZN','META','NFLX','JPM','AMD','V','COIN','PLTR','DIS','SHOP']);
      const trades = rows
        .filter((r) => r.type === 'transfer')
        .filter((r) => {
          const sym = String(r.asset ?? '').toUpperCase();
          return CRYPTO_SYMBOLS.has(sym) || STOCK_SYMBOLS.has(sym);
        })
        .map((r) => {
          const sym = String(r.asset ?? '').toUpperCase();
          const parts = String(r.notes ?? '').trim().split(/\s+/);
          const side = (parts[0]?.toUpperCase() === 'SELL' ? 'SELL' : 'BUY') as 'BUY' | 'SELL';
          const shares = parseFloat(parts[1] ?? '') || 1;
          const usdCost = Number(r.amount) || 0;
          return {
            id: String(r.id),
            symbol: sym,
            type: side,
            amount: shares,
            price: shares > 0 ? usdCost / shares : usdCost,
            date: String(r.created_at ?? ''),
          };
        })
        .slice(0, 6);
      setRecentTrades(trades);
    }).catch(() => {});
  }, [user]);

  const activeStrategyDetails = useMemo(
    () => MOCK_STRATEGIES.filter(s => activeStrategies.includes(s.id)).slice(0, 2),
    [activeStrategies],
  );

  const displayName = user?.user_metadata?.full_name?.split(' ')[0]
    ?? user?.email?.split('@')[0]
    ?? 'Trader';

  const holdings = [
    { symbol: 'BTC', name: 'Bitcoin',  balance: btcBal, price: btcPrice, color: '#F7931A' },
    { symbol: 'ETH', name: 'Ethereum', balance: ethBal, price: ethPrice, color: '#627EEA' },
    { symbol: 'SOL', name: 'Solana',   balance: solBal, price: solPrice, color: '#9945FF' },
  ].filter(h => h.balance > 0 || !walletLoading);

  const now = new Date();
  const dateStr = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-[#080A12] text-white p-4 md:p-8 font-['Inter']">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              {greeting()}, <span className="text-[#4C6FFF]">{displayName}</span> 👋
            </h1>
            <p className="text-sm text-white/40 mt-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> {dateStr}
            </p>
          </div>
          {/* Quick actions */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setDepositOpen(true)}
              className="flex items-center gap-2 h-10 px-4 rounded-xl bg-[#4C6FFF] text-white text-sm font-semibold hover:bg-[#3d5acc] transition-colors"
            >
              <ArrowDownLeft className="w-4 h-4" /> Deposit
            </button>
            <button
              onClick={() => setWithdrawOpen(true)}
              className="flex items-center gap-2 h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-semibold hover:bg-white/10 transition-colors"
            >
              <ArrowUpRight className="w-4 h-4" /> Withdraw
            </button>
            <button
              onClick={() => navigate('/app/markets')}
              className="flex items-center gap-2 h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-semibold hover:bg-white/10 transition-colors"
            >
              <BarChart2 className="w-4 h-4" /> Trade
            </button>
          </div>
        </motion.div>

        {/* â”€â”€ Portfolio Banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1f3a] via-[#0F111A] to-[#080A12] border border-[#4C6FFF]/20 p-6 md:p-8"
        >
          {/* Glow */}
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-[#4C6FFF]/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-24 w-40 h-40 rounded-full bg-[#7C3AED]/5 blur-2xl pointer-events-none" />

          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            {/* Left — total */}
            <div>
              <p className="text-sm text-white/40 uppercase tracking-widest mb-2">Total Portfolio Value</p>
              {walletLoading ? (
                <div className="h-12 w-52 animate-pulse bg-white/5 rounded-xl" />
              ) : (
                <div className="flex items-end gap-4">
                  <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
                    ${fmt(totalValue)}
                  </h2>
                  <div className={`flex flex-wrap items-center gap-1 mb-1 text-xs md:text-sm font-semibold ${change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {change24h >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
                    <span className="text-white/40 font-normal ml-1 whitespace-nowrap">
                      ({change24h >= 0 ? '+' : ''}${fmt(change24hUSD)}) today
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Right — breakdown */}
            <div className="flex flex-wrap gap-6 lg:gap-10">
              <div>
                <p className="text-xs text-white/40 mb-1">Cash (USD)</p>
                <p className="text-lg font-semibold">${fmt(usdBal)}</p>
              </div>
              <div className="w-px bg-white/10 hidden sm:block" />
              <div>
                <p className="text-xs text-white/40 mb-1">Crypto</p>
                <p className="text-lg font-semibold">${fmt(cryptoValue)}</p>
              </div>
              <div className="w-px bg-white/10 hidden sm:block" />
              <div>
                <p className="text-xs text-white/40 mb-1">Locked</p>
                <p className="text-lg font-semibold">${fmt(wallet ? Number(wallet.locked_usd) : 0)}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* â”€â”€ Stat Cards Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="BTC Price"
            value={btcPrice >= 1000 ? `$${(btcPrice / 1000).toFixed(2)}K` : `$${fmt(btcPrice)}`}
            sub={`${btc24h >= 0 ? '+' : ''}${btc24h.toFixed(2)}% today`}
            icon={CircleDollarSign}
            trend={btc24h >= 0 ? 'up' : 'down'}
            delay={0.1}
          />
          <StatCard
            label="ETH Price"
            value={`$${fmt(ethPrice)}`}
            sub={`${eth24h >= 0 ? '+' : ''}${eth24h.toFixed(2)}% today`}
            icon={Activity}
            trend={eth24h >= 0 ? 'up' : 'down'}
            delay={0.15}
          />
          <StatCard
            label="Active Strategies"
            value={`${activeStrategies.length}`}
            sub="running now"
            icon={Cpu}
            trend="neutral"
            delay={0.2}
          />
          <StatCard
            label="AI Signals"
            value={signalsLoading ? '—' : `${topSignals.filter(s => s.action === 'BUY' || s.action === 'STRONG BUY').length} BUY`}
            sub={`${signals.length} total signals`}
            icon={Zap}
            trend="up"
            delay={0.25}
          />
        </div>

        {/* â”€â”€ Middle: Holdings + AI Signals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Holdings */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2 bg-[#0F111A] border border-white/8 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-white">My Holdings</h3>
              <button
                onClick={() => navigate('/app/wallet')}
                className="text-xs text-[#4C6FFF] hover:text-white transition-colors flex items-center gap-1"
              >
                Full Wallet <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {walletLoading ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => <div key={i} className="h-16 animate-pulse bg-white/5 rounded-xl" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {/* USD row */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/4 hover:bg-white/6 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">$</div>
                    <div>
                      <p className="text-sm font-semibold text-white">US Dollar</p>
                      <p className="text-xs text-white/40">USD · Cash balance</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">${fmt(usdBal)}</p>
                    <p className="text-xs text-white/40">{fmt(usdBal, 2)} USD</p>
                  </div>
                </div>

                {holdings.map(h => {
                  const value = h.balance * h.price;
                  const pct = totalValue > 0 ? (value / totalValue) * 100 : 0;
                  return (
                    <div key={h.symbol} className="flex items-center justify-between p-4 rounded-xl bg-white/4 hover:bg-white/6 transition-colors cursor-pointer"
                      onClick={() => navigate(`/app/markets/${h.symbol}`)}>
                      <div className="flex items-center gap-3">
                        <AssetLogo symbol={h.symbol} type="CRYPTO" size="md" />
                        <div>
                          <p className="text-sm font-semibold text-white">{h.name}</p>
                          <p className="text-xs text-white/40">{h.symbol} · {h.balance > 0 ? h.balance.toFixed(6) : '0.000000'} {h.symbol}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-white">${fmt(value)}</p>
                        <div className="flex items-center gap-2 justify-end mt-0.5">
                          <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: h.color }} />
                          </div>
                          <p className="text-xs text-white/40">{pct.toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* AI Signals */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-[#0F111A] border border-white/8 rounded-2xl p-6 flex flex-col"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#4C6FFF]" /> AI Signals
              </h3>
              <button onClick={() => navigate('/app/markets')} className="text-xs text-[#4C6FFF] hover:text-white transition-colors flex items-center gap-1">
                All <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {signalsLoading ? (
              <div className="space-y-3 flex-1">
                {[1,2,3,4,5].map(i => <div key={i} className="h-14 animate-pulse bg-white/5 rounded-xl" />)}
              </div>
            ) : topSignals.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-white/30 text-sm">No signals yet</div>
            ) : (
              <div className="space-y-2 flex-1">
                {topSignals.map(sig => (
                  <div key={sig.id} className="flex items-center justify-between p-3 rounded-xl bg-white/4 hover:bg-white/7 transition-colors cursor-pointer"
                    onClick={() => navigate(`/app/markets/${sig.symbol}`)}>
                    <div className="flex items-center gap-3">
                      <AssetLogo symbol={sig.symbol} type={sig.asset_type === 'STOCK' ? 'STOCK' : 'CRYPTO'} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-white">{sig.symbol}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <MiniSparkline positive={sig.action === 'BUY' || sig.action === 'STRONG BUY'} />
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <SignalBadge action={sig.action} />
                      <p className="text-[10px] text-white/30 mt-1">{sig.confidence}% conf.</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* â”€â”€ Bottom: Recent Trades + Active Strategies â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Recent Trades */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-3 bg-[#0F111A] border border-white/8 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-white">Recent Trades</h3>
              <button onClick={() => navigate('/app/wallet')} className="text-xs text-[#4C6FFF] hover:text-white transition-colors flex items-center gap-1">
                History <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentTrades.length === 0 ? (
              <div className="py-12 text-center">
                <BarChart2 className="w-8 h-8 text-white/20 mx-auto mb-3" />
                <p className="text-sm text-white/30">No trades yet</p>
                <button
                  onClick={() => navigate('/app/markets')}
                  className="mt-3 px-4 py-2 rounded-xl bg-[#4C6FFF]/10 text-[#4C6FFF] text-sm border border-[#4C6FFF]/20 hover:bg-[#4C6FFF]/20 transition-colors"
                >
                  Start Trading
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-white/30 text-xs uppercase tracking-widest">
                      <th className="text-left pb-3 font-medium">Asset</th>
                      <th className="text-left pb-3 font-medium">Side</th>
                      <th className="text-right pb-3 font-medium">Amount</th>
                      <th className="text-right pb-3 font-medium">Price</th>
                      <th className="text-right pb-3 font-medium hidden sm:table-cell">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {recentTrades.map(tx => (
                      <tr key={tx.id} className="hover:bg-white/3 transition-colors">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <AssetLogo symbol={tx.symbol} type={CRYPTO_SYMBOLS.has(tx.symbol) ? 'CRYPTO' : 'STOCK'} size="sm" />
                            <span className="font-medium text-white">{tx.symbol}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${tx.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-right text-white/70">{tx.amount.toFixed(6)}</td>
                        <td className="py-3 pr-4 text-right text-white/70">${fmt(tx.price)}</td>
                        <td className="py-3 text-right text-white hidden sm:table-cell font-medium">
                          ${fmt(tx.amount * tx.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

          {/* Active Strategies */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="lg:col-span-2 bg-[#0F111A] border border-white/8 rounded-2xl p-6 flex flex-col"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#4C6FFF]" /> Active Strategies
              </h3>
              <button onClick={() => navigate('/app/ai-trading-lab')} className="text-xs text-[#4C6FFF] hover:text-white transition-colors flex items-center gap-1">
                Manage <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 space-y-3">
              {activeStrategyDetails.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                  <Cpu className="w-8 h-8 text-white/20 mx-auto mb-3" />
                  <p className="text-sm text-white/30 mb-3">No strategies running</p>
                  <button
                    onClick={() => navigate('/app/ai-trading-lab')}
                    className="px-4 py-2 rounded-xl bg-[#4C6FFF]/10 text-[#4C6FFF] text-sm border border-[#4C6FFF]/20 hover:bg-[#4C6FFF]/20 transition-colors"
                  >
                    Launch AI Lab
                  </button>
                </div>
              ) : (
                activeStrategyDetails.map(s => (
                  <div key={s.id} className="p-4 rounded-xl bg-white/4 border border-white/8 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">{s.name}</p>
                        <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{s.description}</p>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0 shadow-[0_0_6px_#34d399]" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white/5 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-white/30 uppercase tracking-widest">Win Rate</p>
                        <p className="text-xs font-bold text-emerald-400 mt-0.5">{s.winRate}</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-white/30 uppercase tracking-widest">Avg P&L</p>
                        <p className="text-xs font-bold text-emerald-400 mt-0.5">{s.avgProfit}</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-white/30 uppercase tracking-widest">Risk</p>
                        <p className={`text-xs font-bold mt-0.5 ${s.risk === 'High' ? 'text-red-400' : s.risk === 'Low' ? 'text-emerald-400' : 'text-yellow-400'}`}>{s.risk}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* CTA */}
            <button
              onClick={() => navigate('/app/ai-trading-lab')}
              className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-[#4C6FFF]/20 to-[#7C3AED]/20 border border-[#4C6FFF]/20 text-white text-sm font-semibold hover:from-[#4C6FFF]/30 hover:to-[#7C3AED]/30 transition-all flex items-center justify-center gap-2"
            >
              <Bot className="w-4 h-4 text-[#4C6FFF]" /> Open AI Trading Lab
            </button>
          </motion.div>
        </div>

        {/* â”€â”€ Security notice â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="flex items-center gap-3 text-xs text-white/20 bg-white/3 border border-white/5 rounded-xl px-4 py-3"
        >
          <ShieldCheck className="w-4 h-4 shrink-0 text-[#4C6FFF]/40" />
          Vilox AI uses 256-bit AES encryption, 2FA, and real-time fraud monitoring to keep your assets safe.
        </motion.div>

      </div>

      <DepositModal isOpen={depositOpen} onClose={() => setDepositOpen(false)} />
      <WithdrawModal isOpen={withdrawOpen} onClose={() => setWithdrawOpen(false)} />
    </div>
  );
}
