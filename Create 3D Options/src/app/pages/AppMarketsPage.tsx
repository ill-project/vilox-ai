import React, { useState, useMemo } from 'react';
import { Search, TrendingUp, TrendingDown, Lock, ExternalLink, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { TradeModal } from '../components/TradeModal';
import { MarketChart } from '../components/MarketChart';
import { AssetLogo } from '../components/AssetLogo';
import { MOCK_ASSETS } from '../mockData';
import { useMarketData } from '../hooks/useMarketData';
import { useMarketActions } from '../hooks/useMarketActions';
import { useStore } from '../store';
import type { Asset } from '../types';

function getSignalBadge(signal: string) {
  if (signal === 'BUY' || signal === 'STRONG BUY') return 'text-[#00FFA3] bg-[#00FFA3]/10 border-[#00FFA3]/20';
  if (signal === 'SELL') return 'text-[#FF4D4D] bg-[#FF4D4D]/10 border-[#FF4D4D]/20';
  return 'text-[#FBBF24] bg-[#FBBF24]/10 border-[#FBBF24]/20';
}

export function AppMarketsPage() {
  const navigate = useNavigate();
  const livePrices = useMarketData();
  const activeAsset = useStore((s) => s.activeAsset);
  const setActiveAsset = useStore((s) => s.setActiveAsset);
  const { selectAsset } = useMarketActions();
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');

  const filters = ['All', 'Stocks', 'Crypto', 'AI Picks'];

  // Merge live prices into MOCK_ASSETS
  const assets = useMemo<Asset[]>(() => {
    return MOCK_ASSETS.map((asset) => {
      const live = livePrices[asset.symbol];
      if (!live) return asset;
      return {
        ...asset,
        price: live.price,
        change24h: live.change24h,
        lastUpdated: live.source === 'ws' ? 'Live' : live.source === 'rest' ? 'REST' : 'Cached',
      };
    });
  }, [livePrices]);

  const filteredData = useMemo(() => {
    return assets.filter((item) => {
      const matchesFilter =
        activeFilter === 'All' ||
        item.type === activeFilter ||
        (activeFilter === 'AI Picks' && item.signal === 'BUY');
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.symbol.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [assets, activeFilter, search]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Markets</h1>
          <p className="text-[#9CA3AF] flex items-center gap-2">
            Global assets powered by AI signals.
            <span className="flex items-center gap-1 text-xs text-[#00FFA3] bg-[#00FFA3]/10 px-2 py-0.5 rounded-full border border-[#00FFA3]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FFA3] animate-pulse" /> Live
            </span>
          </p>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeFilter === f
                  ? 'bg-[#4C6FFF] text-white'
                  : 'bg-[#111827] text-[#9CA3AF] hover:text-white border border-[#1F2937]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#111827] border border-[#1F2937] rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-[#4C6FFF] text-white placeholder-[#9CA3AF]"
          />
        </div>
      </div>

      {/* Split: table (left) + detail panel (right) */}
      <div className={`flex gap-6 ${activeAsset ? 'flex-col lg:flex-row' : ''}`}>
        {/* Table */}
        <div className={activeAsset ? 'lg:flex-1' : 'w-full'}>
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1F2937] text-xs uppercase tracking-wider text-[#9CA3AF] bg-[#0B0F1A]/50">
                    <th className="px-6 py-4 font-medium">Asset</th>
                    <th className="px-6 py-4 font-medium">Price</th>
                    <th className="px-6 py-4 font-medium">24h</th>
                    <th className="px-6 py-4 font-medium">AI Signal</th>
                    <th className="px-6 py-4 font-medium">Confidence</th>
                    <th className="px-6 py-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-[#1F2937]">
                  {filteredData.map((item) => {
                    const isActive = activeAsset?.symbol === item.symbol;
                    const changeStr = item.change24h >= 0 ? `+${item.change24h.toFixed(2)}%` : `${item.change24h.toFixed(2)}%`;
                    const eliteMask = item.isElite ? 'blur-sm opacity-20 pointer-events-none select-none' : '';
                    return (
                      <motion.tr
                        key={item.id}
                        onClick={() => {
                          if (item.isElite) { navigate('/app/upgrade'); return; }
                          if (isActive) {
                            setActiveAsset(null);
                          } else {
                            setActiveAsset(item);
                          }
                        }}
                        whileHover={{ backgroundColor: item.isElite ? 'rgba(255,215,0,0.04)' : 'rgba(31,41,55,0.4)' }}
                        className={`transition-colors cursor-pointer group ${isActive ? 'bg-[#4C6FFF]/10' : ''} ${item.isElite ? 'relative' : ''}`}
                      >
                        <td className="px-6 py-5">
                          <div className={`flex items-center gap-3 ${eliteMask}`}>
                            <AssetLogo symbol={item.symbol} type={item.type} size="md" />
                            <div>
                              <p className="font-bold text-base text-white">{item.symbol}</p>
                              <p className="text-xs text-[#9CA3AF]">{item.name}</p>
                            </div>
                            {item.isElite && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FBBF24]/10 text-[#FBBF24] border border-[#FBBF24]/20">
                                Elite
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5 font-mono font-medium text-base text-white">
                          <div className={eliteMask}>
                            ${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className={eliteMask}>
                            <span className={item.change24h >= 0 ? 'text-[#00FFA3]' : 'text-[#FF4D4D]'}>
                              {changeStr}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className={eliteMask}>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${getSignalBadge(item.signal)}`}>
                              {item.signal}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-white font-medium font-mono">
                          <div className={eliteMask}>
                            {item.confidence}%
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          {!item.isElite && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                selectAsset(item);
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ml-auto ${
                                item.signal === 'SELL'
                                  ? 'bg-[#FF4D4D]/15 text-[#FF4D4D] border-[#FF4D4D]/30 hover:bg-[#FF4D4D]/25'
                                  : item.signal === 'HOLD'
                                  ? 'bg-[#1F2937] text-[#9CA3AF] border-[#1F2937] hover:bg-[#374151] hover:text-white'
                                  : 'bg-[#00FFA3]/15 text-[#00FFA3] border-[#00FFA3]/30 hover:bg-[#00FFA3]/25'
                              }`}
                            >
                              {item.signal === 'SELL' ? (
                                <><TrendingDown className="w-3 h-3" /> Sell</>
                              ) : item.signal === 'HOLD' ? (
                                'View'
                              ) : (
                                <><TrendingUp className="w-3 h-3" /> Buy</>
                              )}
                            </button>
                          )}
                        </td>
                        {item.isElite && (
                          <td
                            colSpan={6}
                            className="absolute inset-0 z-10 p-0"
                            onClick={(e) => { e.stopPropagation(); navigate('/app/upgrade'); }}
                          >
                            <div className="flex h-full w-full items-center justify-center gap-3 bg-[#0A0E1A]/65 backdrop-blur-[2px] hover:bg-[#FFD700]/5 transition-colors cursor-pointer">
                              <Lock className="w-4 h-4 text-[#FFD700]" />
                              <span className="text-[#FFD700] text-sm font-bold tracking-wide">Elite — Upgrade to Unlock</span>
                              <span className="px-2.5 py-0.5 rounded-full bg-[#FFD700]/10 text-[#FFD700] text-xs font-semibold border border-[#FFD700]/30">
                                Upgrade →
                              </span>
                            </div>
                          </td>
                        )}
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Detail panel — visible when row is selected */}
        <AnimatePresence>
          {activeAsset && (
            <motion.div
              key={activeAsset.symbol}
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 32 }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              className="lg:w-80 xl:w-96 flex flex-col gap-4 shrink-0"
            >
              {/* Header */}
              <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <AssetLogo symbol={activeAsset.symbol} type={activeAsset.type} size="lg" />
                    <div>
                      <p className="font-bold text-white text-lg">{activeAsset.symbol}</p>
                      <p className="text-xs text-[#9CA3AF]">{activeAsset.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => navigate(`/market/${activeAsset.symbol.toLowerCase()}`)}
                      className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                      title="Full page"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setActiveAsset(null)}
                      className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                      title="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-2xl font-mono text-white mb-1">
                  ${activeAsset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                </p>
                <span className={`text-sm font-mono ${activeAsset.change24h >= 0 ? 'text-[#00FFA3]' : 'text-[#FF4D4D]'}`}>
                  {activeAsset.change24h >= 0 ? '+' : ''}{activeAsset.change24h.toFixed(2)}% (24h)
                </span>
              </div>

              {/* Live chart */}
              <MarketChart symbol={activeAsset.symbol} type={activeAsset.type} height={200} />

              {/* Signal + Trade */}
              <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-5 flex flex-col gap-3">
                <span className={`inline-flex px-2.5 py-1 rounded text-xs font-bold border w-fit ${getSignalBadge(activeAsset.signal)}`}>
                  {activeAsset.signal}
                </span>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${activeAsset.confidence}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-full rounded-full ${activeAsset.confidence > 90 ? 'bg-[#4C6FFF]' : 'bg-white/40'}`}
                  />
                </div>
                <p className="text-white/40 text-xs font-mono">{activeAsset.confidence}% confidence</p>
                <button
                  onClick={() => selectAsset(activeAsset)}
                  className="mt-1 w-full py-3 rounded-xl font-semibold text-sm bg-[#4C6FFF] hover:bg-[#3a5cff] text-white transition-all shadow-[0_0_20px_#4C6FFF30]"
                >
                  {activeAsset.signal === 'SELL' ? 'Sell / Short' : 'Buy / Long'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Trade modal */}
      <AnimatePresence>
        {activeAsset && (
          <TradeModal
            key="app-markets-trade-modal"
            asset={activeAsset}
            onClose={() => setActiveAsset(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
