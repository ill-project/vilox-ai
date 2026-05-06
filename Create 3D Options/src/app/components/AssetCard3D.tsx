import React from 'react';
import { motion } from 'motion/react';
import { Asset } from '../types';
import { Lock, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { AssetLogo } from './AssetLogo';

interface AssetCard3DProps {
  asset: Asset;
  onClick: (asset: Asset) => void;
  isUserElite?: boolean;
}

export const AssetCard3D: React.FC<AssetCard3DProps> = ({ asset, onClick, isUserElite = false }) => {
  const isLocked = asset.isElite && !isUserElite;
  
  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'BUY': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'SELL': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    }
  };

  return (
    <motion.div
      onClick={() => {
        if (!isLocked) onClick(asset);
      }}
      className={`relative rounded-2xl h-[280px] w-full cursor-pointer ${
        isLocked ? 'pointer-events-none' : ''
      }`}
      style={{ perspective: 1000 }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Base Layer - Glass Background */}
      <motion.div
        className="absolute inset-0 rounded-2xl bg-white/[0.05] border border-white/10 backdrop-blur-[12px] shadow-lg overflow-hidden"
        style={{ zIndex: 1 }}
      >
        {/* Glow effect on hover (simulated via gradient) */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#4C6FFF]/0 to-[#4C6FFF]/0 hover:from-[#4C6FFF]/5 hover:to-transparent transition-all duration-500 rounded-2xl" />
      </motion.div>

      {/* Locked Overlay */}
      {isLocked && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0F111A]/60 backdrop-blur-md rounded-2xl border border-[#4C6FFF]/30">
          <Lock className="w-8 h-8 text-[#4C6FFF] mb-2" />
          <div className="text-sm font-semibold text-white tracking-widest uppercase">Elite Tier</div>
          <div className="text-xs text-white/50 mt-1 text-center px-4">Upgrade to unlock AI Signal</div>
        </div>
      )}

      {/* Top Layer - Content */}
      <motion.div
        className="relative z-10 w-full h-full p-6 flex flex-col justify-between"
        style={{ transformStyle: 'preserve-3d' }}
        whileHover={{ translateZ: 30 }}
      >
        {/* Header: Symbol & Live Pulse */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <AssetLogo symbol={asset.symbol} type={asset.type} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-semibold text-lg leading-none">{asset.symbol}</h3>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/60 font-mono tracking-widest">{asset.type}</span>
              </div>
              <span className="text-white/50 text-xs">{asset.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {asset.live ? (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            ) : (
              <span className="h-2 w-2 rounded-full bg-red-500/50"></span>
            )}
          </div>
        </div>

        {/* Price & Change */}
        <div className="my-4">
          <div className="text-xl sm:text-2xl font-mono text-white tracking-tight truncate">
            ${asset.price < 0.01
              ? asset.price.toFixed(6)
              : asset.price < 1
              ? asset.price.toFixed(4)
              : asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={`flex items-center gap-1 text-sm mt-1 font-mono ${asset.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {asset.change24h >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {Math.abs(asset.change24h).toFixed(2)}% (24h)
          </div>
        </div>

        {/* AI Signal Block */}
        <div className="mt-auto bg-black/20 rounded-xl p-3 border border-white/5">
          <div className="flex justify-between items-center mb-2">
            <div className={`px-2 py-1 rounded text-xs font-bold border ${getSignalColor(asset.signal)}`}>
              {asset.signal} SIGNAL
            </div>
            <div className="flex items-center text-[10px] text-white/40 uppercase tracking-widest gap-1">
              <Clock className="w-3 h-3" /> {asset.lastUpdated}
            </div>
          </div>
          
          {/* Confidence Score Progress */}
          <div className="space-y-1 mt-3">
            <div className="flex justify-between text-xs text-white/60 font-mono">
              <span>AI CONFIDENCE</span>
              <span className={asset.confidence > 90 ? 'text-[#4C6FFF]' : ''}>{asset.confidence}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${asset.confidence}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={`h-full rounded-full ${asset.confidence > 90 ? 'bg-[#4C6FFF] shadow-[0_0_10px_#4C6FFF]' : 'bg-white/50'}`}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
