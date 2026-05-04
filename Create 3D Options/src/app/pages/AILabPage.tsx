import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { StrategyCard3D } from '../components/StrategyCard3D';
import { useRotatingStrategies } from '../hooks/useRotatingStrategies';
import { AIPerformanceCharts } from '../components/AIPerformanceCharts';
import { AssetLogo } from '../components/AssetLogo';
import { useGlobalContext } from '../context/GlobalContext';
import { useSignals } from '../hooks/useSignals';
import { Zap, ShieldAlert, Crosshair, Wallet, CheckCircle2, AlertTriangle, X, RefreshCw } from 'lucide-react';

// Flashes + slides in whenever `value` changes (e.g. on 60-second refresh)
const FlashValue: React.FC<{ value: string | number; className?: string; children: React.ReactNode }> = ({ value, className, children }) => (
  <AnimatePresence mode="wait">
    <motion.span
      key={String(value)}
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 5 }}
      transition={{ duration: 0.22 }}
      className={className}
    >
      {children}
    </motion.span>
  </AnimatePresence>
);

export const AILabPage: React.FC = () => {
  const { executeTrade, wallet, portfolioValue } = useGlobalContext();
  const { strategies, minutesLeft } = useRotatingStrategies();
  const { signals, isLoading: signalsLoading, lastUpdated } = useSignals();
  const navigate = useNavigate();
  const walletBalance = Number(wallet?.usd ?? 0);

  // Toast state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const FEE_RATE = 0.001;
  const calcTradeCost = (price: number | null | undefined, amount = 1) =>
    (Number(price) || 0) * amount * (1 + FEE_RATE);

  const handleExecuteSignal = async (signal: { id: string; symbol: string; action: string; price: number }) => {
    if (signal.action === 'HOLD') return;

    const is买 = signal.action === 'BUY' || signal.action === 'STRONG BUY';
    const side: 'BUY' | 'SELL' = is买 ? 'BUY' : 'SELL';
    const tradeCost = calcTradeCost(signal.price);

    // Insufficient balance guard — compare against actual trade cost
    if (side === 'BUY' && walletBalance < tradeCost) {
      navigate('/app/dashboard', { state: { depositIntent: true, returnTo: '/app/ai-lab' } });
      showToast('error', `Insufficient balance. You need $${tradeCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to buy 1 unit of ${signal.symbol}.`);
      return;
    }

    setExecutingId(signal.id);
    try {
      await executeTrade(signal.symbol, side, 1, signal.price);
      showToast('success', `${side} 1 unit of ${signal.symbol} executed successfully!`);
    } catch (err) {
      showToast('error', (err as Error).message || 'Trade failed. Please try again.');
    } finally {
      setExecutingId(null);
    }
  };

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'BUY': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'SELL': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    }
  };

  return (
    <>
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 space-y-8">
      
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-1">AI Trading Lab</h1>
          <p className="text-sm text-white/50">Quantum neural network strategy execution & insights.</p>
        </div>
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 self-start sm:self-auto">
          <Wallet className="w-4 h-4 text-white/40 shrink-0" />
          <div>
            <div className="text-[10px] text-white/40 uppercase tracking-widest">Available Liquidity</div>
            <div className="text-base font-mono font-medium text-white">
              ${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </header>

      {/* Top Section: Charts & Stats */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AIPerformanceCharts />
        </div>
        <div className="flex flex-col gap-6">
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 flex-1 flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#4C6FFF]/10 rounded-full blur-3xl -z-10 group-hover:bg-[#4C6FFF]/20 transition-colors duration-500" />
            <Crosshair className="w-8 h-8 text-[#4C6FFF] mb-4" />
            <h3 className="text-sm font-semibold text-white tracking-widest uppercase mb-1">Global Accuracy</h3>
            <div className="text-4xl font-mono font-bold text-white mb-2">94.2%</div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
               <motion.div initial={{width:0}} animate={{width:'94.2%'}} transition={{duration:1}} className="h-full bg-[#4C6FFF] shadow-[0_0_10px_#4C6FFF]" />
            </div>
          </div>
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 flex-1 flex flex-col justify-center">
             <ShieldAlert className="w-8 h-8 text-emerald-400 mb-4" />
             <h3 className="text-sm font-semibold text-white tracking-widest uppercase mb-1">System Risk Status</h3>
             <div className="text-2xl font-bold text-emerald-400">Low Exposure</div>
             <p className="text-xs text-white/50 mt-2">Capital preservation algorithms are active.</p>
          </div>
        </div>
      </section>

      {/* Strategy Execution Grid */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#4C6FFF]" />
            <h2 className="text-xl font-semibold tracking-tight text-white">Active Strategies</h2>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-white/30 border border-white/10 rounded px-2 py-1 bg-white/5">
            <RefreshCw className="w-3 h-3" />
            Rotates in {minutesLeft}m
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {strategies.map(strategy => (
            <StrategyCard3D key={strategy.id} strategy={strategy} />
          ))}
        </div>
      </section>

      {/* AI Signals List */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold tracking-tight text-white">Live AI Signals</h2>
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded px-2 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              CoinGecko Live
            </span>
          </div>
          <span className="text-xs text-white/30 font-mono">
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading…'}
          </span>
        </div>
        
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs text-white/40 uppercase tracking-widest bg-black/40">
                  <th className="px-6 py-4 font-medium">Asset</th>
                  <th className="px-6 py-4 font-medium">Signal</th>
                  <th className="px-6 py-4 font-medium">Confidence</th>
                  <th className="px-6 py-4 font-medium">Risk</th>
                  <th className="px-6 py-4 font-medium">Price (USD)</th>
                  <th className="px-6 py-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {signalsLoading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-white/30 text-sm">Loading signals…</td></tr>
                ) : (
                  signals.map((signal) => (
                    <motion.tr 
                      key={signal.id}
                      whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                      className="transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <AssetLogo symbol={signal.symbol} type={signal.asset_type as any} size="sm" imageUrl={signal.image_url} />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-white">{signal.symbol}</span>
                              <span className={`text-[9px] font-bold px-1 py-0.5 rounded uppercase tracking-wider ${signal.asset_type === 'STOCK' ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' : 'bg-[#4C6FFF]/10 text-[#4C6FFF] border border-[#4C6FFF]/20'}`}>
                                {signal.asset_type === 'STOCK' ? 'STOCK' : 'CRYPTO'}
                              </span>
                            </div>
                            {signal.reason && (
                              <p className="text-[10px] text-white/30 max-w-[180px] truncate mt-0.5">{signal.reason}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <FlashValue value={signal.action}>
                          <span className={`px-2 py-1 rounded text-[10px] font-bold border ${getSignalColor(signal.action)}`}>
                            {signal.action}
                          </span>
                        </FlashValue>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm">
                        <FlashValue value={signal.confidence} className={signal.confidence > 90 ? 'text-[#4C6FFF]' : 'text-white/70'}>
                          {signal.confidence}%
                        </FlashValue>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <FlashValue value={signal.risk} className="text-white/60">
                          {signal.risk}
                        </FlashValue>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm">
                        <FlashValue value={signal.price ?? 0} className="text-white/80">
                          {signal.price != null
                            ? `$${Number(signal.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: Number(signal.price) >= 1 ? 2 : 6 })}`
                            : '—'}
                        </FlashValue>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end gap-1">
                          {signal.action !== 'HOLD' && (
                            <span className="text-[10px] text-white/30 font-mono">
                              ~${calcTradeCost(signal.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </span>
                          )}
                          <button
                            onClick={() => handleExecuteSignal(signal)}
                            disabled={signal.action === 'HOLD' || executingId === signal.id}
                            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold tracking-wide transition-colors border border-white/10 min-w-[110px]"
                          >
                            {executingId === signal.id ? (
                              <span className="flex items-center justify-center gap-1.5">
                                <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                Executing…
                              </span>
                            ) : signal.action === 'HOLD' ? 'Hold' : 'Execute 1 Unit'
                            }
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

    </main>

    {/* Toast notification */}
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className={`fixed bottom-6 right-6 z-[300] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border max-w-sm ${
            toast.type === 'success'
              ? 'bg-[#0D1F16] border-green-500/30 text-green-400'
              : 'bg-[#1F0D0D] border-red-500/30 text-red-400'
          }`}
        >
          {toast.type === 'success'
            ? <CheckCircle2 className="w-5 h-5 shrink-0" />
            : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <p className="text-sm font-medium leading-snug flex-1">{toast.message}</p>
          <button onClick={() => setToast(null)} className="text-white/30 hover:text-white/70 ml-1">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
};
