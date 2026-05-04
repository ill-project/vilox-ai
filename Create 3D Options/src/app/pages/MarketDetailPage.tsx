import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MOCK_ASSETS } from '../mockData';
import { useMarketData } from '../hooks/useMarketData';
import { MarketChart } from '../components/MarketChart';
import { TradeModal } from '../components/TradeModal';
import { AssetLogo } from '../components/AssetLogo';
import { useStore } from '../store';
import { useMarketActions } from '../hooks/useMarketActions';
import type { Asset } from '../types';

export function MarketDetailPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const livePrices = useMarketData();
  const activeAsset = useStore((s) => s.activeAsset);
  const setActiveAsset = useStore((s) => s.setActiveAsset);
  const { selectAsset } = useMarketActions();

  // Resolve the asset from the URL param, merging live prices
  const asset = useMemo<Asset | null>(() => {
    if (!symbol) return null;
    const base = MOCK_ASSETS.find(
      (a) => a.symbol.toLowerCase() === symbol.toLowerCase(),
    );
    if (!base) return null;
    const live = livePrices[base.symbol];
    if (!live) return base;
    return {
      ...base,
      price: live.price,
      change24h: live.change24h,
      lastUpdated: live.source === 'ws' ? 'Live' : live.source === 'rest' ? 'REST' : 'Cached',
    };
  }, [symbol, livePrices]);

  if (!asset) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-white/40">
        <p className="text-lg font-mono">Asset not found: {symbol?.toUpperCase()}</p>
        <button
          onClick={() => navigate('/app/markets')}
          className="mt-4 text-[#4C6FFF] hover:underline text-sm"
        >
          ← Back to Markets
        </button>
      </div>
    );
  }

  const isPositive = asset.change24h >= 0;
  const signalColor =
    asset.signal === 'BUY'
      ? 'text-[#00FFA3] bg-[#00FFA3]/10 border-[#00FFA3]/20'
      : asset.signal === 'SELL'
      ? 'text-[#FF4D4D] bg-[#FF4D4D]/10 border-[#FF4D4D]/20'
      : 'text-[#FBBF24] bg-[#FBBF24]/10 border-[#FBBF24]/20';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
      {/* Back nav */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-white/50 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <AssetLogo symbol={asset.symbol} type={asset.type} size="lg" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">{asset.symbol}</h1>
              <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-white/50 font-mono tracking-widest">
                {asset.type}
              </span>
              {asset.live && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
              )}
            </div>
            <p className="text-white/50 text-sm">{asset.name}</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className="text-3xl font-mono text-white tracking-tighter">
            $
            {asset.price.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 6,
            })}
          </span>
          <span
            className={`flex items-center gap-1 text-sm font-mono ${
              isPositive ? 'text-[#00FFA3]' : 'text-[#FF4D4D]'
            }`}
          >
            {isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            {isPositive ? '+' : ''}
            {asset.change24h.toFixed(2)}% (24h)
          </span>
        </div>
      </div>

      {/* Main split: chart (left) + stats/trade (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart — takes 2/3 width on large screens */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <MarketChart symbol={asset.symbol} type={asset.type} height={360} />

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Volume', value: asset.volume },
              { label: 'Confidence', value: `${asset.confidence}%` },
              { label: 'Last Updated', value: asset.lastUpdated },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 text-center"
              >
                <p className="text-white/40 text-xs uppercase tracking-widest mb-1">
                  {stat.label}
                </p>
                <p className="text-white font-mono text-sm">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel: AI signal + trade button */}
        <div className="flex flex-col gap-4">
          {/* AI Signal card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-[#4C6FFF]" />
              <span className="text-xs font-semibold text-white/60 uppercase tracking-widest">
                AI Signal
              </span>
            </div>

            <div className={`inline-flex px-3 py-1.5 rounded-lg text-sm font-bold border ${signalColor} mb-4`}>
              {asset.signal}
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-white/50 mb-1 font-mono">
                  <span>CONFIDENCE</span>
                  <span className={asset.confidence > 90 ? 'text-[#4C6FFF]' : ''}>
                    {asset.confidence}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${asset.confidence}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={`h-full rounded-full ${
                      asset.confidence > 90
                        ? 'bg-[#4C6FFF] shadow-[0_0_10px_#4C6FFF]'
                        : 'bg-white/50'
                    }`}
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Trade CTA */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5"
          >
            <p className="text-white/50 text-sm mb-4">
              Execute a trade on {asset.name} at the current market price.
            </p>
            <button
              onClick={() => selectAsset(asset)}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all bg-[#4C6FFF] hover:bg-[#3a5cff] text-white shadow-[0_0_20px_#4C6FFF40]"
            >
              {asset.signal === 'SELL' ? 'Sell / Short' : 'Buy / Long'}
            </button>
          </motion.div>
        </div>
      </div>

      {/* Trade Modal overlay */}
      <AnimatePresence>
        {activeAsset && (
          <TradeModal
            key="detail-trade-modal"
            asset={activeAsset}
            onClose={() => setActiveAsset(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
