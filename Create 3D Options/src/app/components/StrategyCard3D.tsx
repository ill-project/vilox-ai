import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, BrainCircuit, Activity, Zap, X, Play, Square } from 'lucide-react';
import { useGlobalContext } from '../context/GlobalContext';

interface StrategyProps {
  strategy: {
    id: string;
    name: string;
    confidence: number;
    risk: string;
    winRate: string;
    avgProfit: string;
    maxDrawdown: string;
    description: string;
  };
}

export const StrategyCard3D: React.FC<StrategyProps> = ({ strategy }) => {
  const { activeStrategies, toggleStrategy } = useGlobalContext();
  const isActive = activeStrategies.includes(strategy.id);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const getRiskColor = (risk: string) => {
    switch(risk) {
      case 'Low': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'Medium': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'High': return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
      default: return 'text-white/50 bg-white/5 border-white/10';
    }
  };

  return (
    <>
      <motion.div
        onClick={() => setIsModalOpen(true)}
        className="relative rounded-2xl h-[240px] w-full cursor-pointer group"
        style={{ perspective: 1000 }}
        whileHover={{ scale: 1.02, rotateX: 2, rotateY: 2 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {/* Base Layer */}
        <div className={`absolute inset-0 rounded-2xl bg-white/[0.03] backdrop-blur-[12px] shadow-lg overflow-hidden border transition-colors duration-500 ${isActive ? 'border-[#4C6FFF]/40 shadow-[0_0_20px_rgba(76,111,255,0.15)]' : 'border-white/10'}`}>
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full h-full p-6 flex flex-col justify-between" style={{ transformStyle: 'preserve-3d' }}>
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center border border-white/10 text-white shadow-inner">
                <BrainCircuit className="w-5 h-5 text-white/70" />
              </div>
              <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest border flex items-center gap-1.5 ${isActive ? 'text-[#4C6FFF] border-[#4C6FFF]/30 bg-[#4C6FFF]/10' : 'text-white/40 border-white/10 bg-white/5'}`}>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#4C6FFF] animate-pulse" />}
                {isActive ? 'Active' : 'Inactive'}
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-white tracking-tight leading-tight">{strategy.name}</h3>
            <p className="text-xs text-white/50 mt-2 line-clamp-2 leading-relaxed">{strategy.description}</p>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
            <div>
              <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">AI Confidence</div>
              <div className="text-lg font-mono font-medium text-white">{strategy.confidence}%</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Risk Profile</div>
              <div className={`px-2 py-0.5 rounded text-xs font-mono border ${getRiskColor(strategy.risk)}`}>
                {strategy.risk}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm bg-[#0F111A]/80">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0F111A]/95 border border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-[#4C6FFF]/10 p-8"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-full bg-[#4C6FFF]/10 flex items-center justify-center border border-[#4C6FFF]/30">
                  <BrainCircuit className="w-7 h-7 text-[#4C6FFF]" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">{strategy.name}</h2>
                  <div className="text-sm font-mono text-[#4C6FFF] mt-1">Vilox AI Quantum Engine</div>
                </div>
              </div>

              <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 mb-8">
                <p className="text-white/70 text-sm leading-relaxed mb-6">{strategy.description}</p>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                    <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Win Rate</div>
                    <div className="text-xl font-mono text-white">{strategy.winRate}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                    <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Avg Profit</div>
                    <div className="text-xl font-mono text-green-400">{strategy.avgProfit}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                    <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Max Drawdown</div>
                    <div className="text-xl font-mono text-red-400">{strategy.maxDrawdown}</div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => toggleStrategy(strategy.id)}
                className={`w-full h-14 rounded-xl font-bold tracking-wide transition-all flex items-center justify-center gap-2 ${
                  isActive 
                    ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                    : 'bg-[#4C6FFF] hover:bg-[#3d5acc] text-white shadow-[0_0_20px_rgba(76,111,255,0.4)]'
                }`}
              >
                {isActive ? (
                  <><Square className="w-4 h-4 fill-current" /> Deactivate Strategy</>
                ) : (
                  <><Play className="w-4 h-4 fill-current" /> Initialize Quantum Trade</>
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
