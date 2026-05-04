import React, { useState } from 'react';
import { Search, Eye, EyeOff, Activity, Wallet } from 'lucide-react';
import { useGlobalContext } from '../context/GlobalContext';

interface SearchHeaderProps {
  onSearch: (query: string) => void;
}

export const SearchHeader: React.FC<SearchHeaderProps> = ({ onSearch }) => {
  const { walletBalance, portfolioValue } = useGlobalContext();
  const [showBalance, setShowBalance] = useState(true);
  
  const totalBalance = `$${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const liquidity = `$${walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const hiddenBalance = "••••••••••••";

  return (
    <header className="w-full flex flex-col md:flex-row items-center justify-between gap-6 py-6 border-b border-white/10 mb-8">
      {/* Brand & Market Status */}
      <div className="flex items-center gap-4 w-full md:w-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#4C6FFF]/20 flex items-center justify-center border border-[#4C6FFF]/50 shadow-[0_0_15px_rgba(76,111,255,0.3)]">
            <Activity className="text-[#4C6FFF] w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white m-0">Vilox<span className="text-[#4C6FFF]">AI</span></h1>
            <div className="flex items-center gap-2 text-xs text-white/50 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              Live Markets
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="w-full md:max-w-md relative group">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-white/40 group-focus-within:text-[#4C6FFF] transition-colors" />
        </div>
        <input
          type="text"
          placeholder="Search assets, symbols, or signals..."
          onChange={(e) => onSearch(e.target.value)}
          className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#4C6FFF]/50 focus:border-[#4C6FFF]/50 transition-all backdrop-blur-[12px]"
        />
      </div>

      {/* Unified Balances */}
      <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2 text-xs text-white/50 uppercase tracking-widest mb-1">
            <Wallet className="w-3 h-3" />
            Wallet Balance
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="text-white/40 hover:text-white/80 transition-colors ml-1"
            >
              {showBalance ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </button>
          </div>
          <div className="text-lg font-mono font-medium text-white tracking-tight">
            {showBalance ? totalBalance : hiddenBalance}
          </div>
        </div>
        
        <div className="h-10 w-px bg-white/10 hidden md:block"></div>
        
        <div className="flex flex-col items-end">
          <div className="text-xs text-white/50 uppercase tracking-widest mb-1">
            Available Liquidity
          </div>
          <div className="text-lg font-mono font-medium text-[#4C6FFF] tracking-tight">
            {showBalance ? liquidity : hiddenBalance}
          </div>
        </div>
      </div>
    </header>
  );
};
