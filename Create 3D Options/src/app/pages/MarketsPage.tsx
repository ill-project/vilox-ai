import React, { useMemo, useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Activity, X, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { MOCK_ASSETS } from '../mockData';
import { SearchHeader } from '../components/SearchHeader';
import { MarketGrid } from '../components/MarketGrid';
import { TradeModal } from '../components/TradeModal';
import { MarketChart } from '../components/MarketChart';
import { AssetLogo } from '../components/AssetLogo';
import { useMarketData } from '../hooks/useMarketData';
import { useMarketActions } from '../hooks/useMarketActions';
import { useStore } from '../store';
import { useAuth } from '../context/AuthContext';
import { getUserProfile } from '../lib/db';
import type { Asset } from '../types';

export const MarketsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const livePrices = useMarketData();
  const activeAsset = useStore((s) => s.activeAsset);
  const setActiveAsset = useStore((s) => s.setActiveAsset);
  const [searchQuery, setSearchQuery] = React.useState('');
  const { selectAsset } = useMarketActions();

  // Fetch user's subscription plan
  const [userPlan, setUserPlan] = useState<string>('starter');
  useEffect(() => {
    if (!user) return;
    getUserProfile(user.id)
      .then((p) => { if (p?.plan) setUserPlan(p.plan); })
      .catch(() => {});
  }, [user]);
  const isUserElite = userPlan === 'pro' || userPlan === 'elite';

  // Merge live prices into mock assets; fall back to mock price if WS/REST unavailable
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

  // Active asset with merged live price
  const displayedAsset = useMemo<Asset | null>(() => {
    if (!activeAsset) return null;
    return assets.find((a) => a.symbol === activeAsset.symbol) ?? activeAsset;
  }, [activeAsset, assets]);

  const isSplit = !!displayedAsset;

  const signalColor = (signal: string) =>
    signal === 'BUY'
      ? 'text-[#00FFA3] bg-[#00FFA3]/10 border-[#00FFA3]/20'
      : signal === 'SELL'
      ? 'text-[#FF4D4D] bg-[#FF4D4D]/10 border-[#FF4D4D]/20'
      : 'text-[#FBBF24] bg-[#FBBF24]/10 border-[#FBBF24]/20';

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
      <div className="mb-6 flex items-center justify-between">
        <SearchHeader onSearch={setSearchQuery} />
        <div className="hidden sm:flex items-center gap-2 text-xs text-white/40 uppercase tracking-widest">
          <span className="w-2 h-2 rounded-full bg-green-500/50 mr-1 animate-pulse" />
          Live
        </div>
      </div>

      {/* Split-view: grid (left) + detail panel (right) */}
      <div
        className={`flex gap-6 transition-all duration-300 ${
          isSplit ? 'flex-col lg:flex-row' : ''
        }`}
      >
        {/* Asset grid */}
        <div className={isSplit ? 'lg:w-1/2 xl:w-5/12' : 'w-full'}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Active Signals</h2>
          </div>
          <MarketGrid
            assets={assets}
            isLoading={Object.keys(livePrices).length === 0}
            searchQuery={searchQuery}
            isUserElite={isUserElite}
            onSelectAsset={(asset) => {
              // If same asset, deselect; otherwise set active via actions hook (balance check)
              if (activeAsset?.symbol === asset.symbol) {
                setActiveAsset(null);
              } else {
                setActiveAsset(asset);
              }
            }}
          />
        </div>

        {/* Detail panel — shown when an asset is selected */}
        <AnimatePresence>
          {displayedAsset && (
            <motion.div
              key={displayedAsset.symbol}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              className="lg:flex-1 flex flex-col gap-4"
            >
              {/* Panel header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AssetLogo symbol={displayedAsset.symbol} type={displayedAsset.type} size="lg" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-white">{displayedAsset.symbol}</h3>
                      {displayedAsset.live && (
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                        </span>
                      )}
                    </div>
                    <p className="text-white/40 text-xs">{displayedAsset.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/market/${displayedAsset.symbol.toLowerCase()}`)}
                    className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                    title="Open full page"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setActiveAsset(null)}
                    className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-end gap-3">
                <span className="text-3xl font-mono text-white tracking-tighter">
                  $
                  {displayedAsset.price.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 6,
                  })}
                </span>
                <span
                  className={`flex items-center gap-1 text-sm font-mono mb-1 ${
                    displayedAsset.change24h >= 0 ? 'text-[#00FFA3]' : 'text-[#FF4D4D]'
                  }`}
                >
                  {displayedAsset.change24h >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  {displayedAsset.change24h >= 0 ? '+' : ''}
                  {displayedAsset.change24h.toFixed(2)}%
                </span>
              </div>

              {/* Live chart */}
              <MarketChart symbol={displayedAsset.symbol} type={displayedAsset.type} height={260} />

              {/* AI Signal */}
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4 text-[#4C6FFF]" />
                  <span className="text-xs font-semibold text-white/50 uppercase tracking-widest">
                    AI Signal
                  </span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`inline-flex px-2.5 py-1 rounded text-xs font-bold border ${signalColor(
                      displayedAsset.signal,
                    )}`}
                  >
                    {displayedAsset.signal}
                  </span>
                  <span className="text-white/40 text-xs font-mono">
                    {displayedAsset.confidence}% confidence
                  </span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${displayedAsset.confidence}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-full rounded-full ${
                      displayedAsset.confidence > 90
                        ? 'bg-[#4C6FFF] shadow-[0_0_10px_#4C6FFF]'
                        : 'bg-white/40'
                    }`}
                  />
                </div>
              </div>

              {/* Trade button */}
              <button
                onClick={() => selectAsset(displayedAsset)}
                className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all bg-[#4C6FFF] hover:bg-[#3a5cff] text-white shadow-[0_0_24px_#4C6FFF40]"
              >
                {displayedAsset.signal === 'SELL' ? 'Sell / Short' : 'Buy / Long'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Trade Modal */}
      <AnimatePresence>
        {activeAsset && (
          <TradeModal
            key="markets-trade-modal"
            asset={activeAsset}
            onClose={() => setActiveAsset(null)}
          />
        )}
      </AnimatePresence>
    </main>
  );
};

