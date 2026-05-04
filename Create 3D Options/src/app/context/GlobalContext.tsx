import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { fetchActiveStrategyKeys, upsertStrategy } from '../services/supabaseService';
import { executeTrade as rpcExecuteTrade } from '../services/tradingService';
import { useWallet } from '../hooks/useWallet';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import type { AssetSymbol, TransactionType } from '../store';
import { getUserTrades, addTransaction, insertPortfolioSnapshot } from '../lib/db';
import { MOCK_STRATEGIES } from '../mockData';
import type { WalletRow } from '../services/supabaseService';
import { useMarketData } from '../hooks/useMarketData';

interface Trade {
  id: string;
  assetSymbol: string;
  type: 'BUY' | 'SELL';
  amount: number;
  cost: number;
  timestamp: string;
}

interface GlobalContextType {
  wallet: WalletRow | null;
  walletLoading: boolean;
  walletBalance: number;
  portfolioValue: number;
  activeStrategies: string[];
  trades: Trade[];
  executeTrade: (assetSymbol: string, type: 'BUY' | 'SELL', amount: number, cost: number) => Promise<void>;
  toggleStrategy: (strategyId: string) => void;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { wallet, isLoading: walletLoading, refresh: refreshWallet } = useWallet();
  const { syncFromWallet, setTransactions } = useStore();
  const prices = useMarketData();
  const [activeStrategies, setActiveStrategies] = useState<string[]>(['strat-1']);
  const [trades, setTrades] = useState<Trade[]>([]);

  // Wallet balance sourced from useWallet (Realtime-backed)
  const walletBalance = wallet ? Number(wallet.usd) : 0;
  // Subscribe to realtime wallet changes for instant updates (admin, etc)
  useEffect(() => {
    if (!user?.id) return;
    // Initial fetch
    refreshWallet();
    // Subscribe to realtime changes
    const channel = supabase
      .channel('wallet-changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'wallets',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        // Update wallet state immediately when admin changes balance
        refreshWallet();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, refreshWallet]);

  // Derive total portfolio value (USD cash + crypto at live prices) reactively
  const portfolioValue = useMemo(() => {
    if (!wallet) return 0;
    const btcP = prices['BTC']?.price ?? 0;
    const ethP = prices['ETH']?.price ?? 0;
    const solP = prices['SOL']?.price ?? 0;
    return (
      Number(wallet.usd) +
      Number(wallet.btc) * btcP +
      Number(wallet.eth) * ethP +
      Number(wallet.sol) * solP +
      Number(wallet.usdt)
    );
  }, [wallet, prices]);

  // Keep Zustand store in sync with real wallet data
  useEffect(() => {
    if (wallet) {
      syncFromWallet(
        Number(wallet.usd),
        Number(wallet.btc),
        Number(wallet.eth),
        Number(wallet.sol),
      );
    }
  }, [wallet, syncFromWallet]);

  // Load active strategies on auth
  useEffect(() => {
    if (!user) return;
    fetchActiveStrategyKeys(user.id)
      .then(keys => { if (keys.length > 0) setActiveStrategies(keys); })
      .catch(() => {});
  }, [user]);

  // Seed Zustand transaction history from DB on auth so it survives page reload
  useEffect(() => {
    if (!user) {
      setTransactions([]);
      return;
    }
    getUserTrades(user.id)
      .then(rows => {
        setTransactions(
          (rows as Array<Record<string, unknown>>).map(r => ({
            id: r.id as string,
            symbol: (r.symbol as string) as AssetSymbol,
            type: (r.side as string) as TransactionType,
            amount: Number(r.amount),
            price: Number(r.price),
            date: r.created_at as string,
          }))
        );
      })
      .catch(() => {});
  }, [user, setTransactions]);

  const executeTrade = async (assetSymbol: string, type: 'BUY' | 'SELL', amount: number, cost: number) => {
    const price = amount > 0 ? cost / amount : 0;
    const assetType = ['BTC', 'ETH', 'SOL', 'USDT'].includes(assetSymbol.toUpperCase()) ? 'CRYPTO' : 'STOCK';

    const result = await rpcExecuteTrade({
      symbol: assetSymbol,
      assetType: assetType as 'CRYPTO' | 'STOCK' | 'ETF',
      side: type,
      amount,
      price,
    });

    if (!result.success) {
      throw new Error(result.error ?? 'Trade failed');
    }

    // Always refresh wallet from Supabase after trade
    await refreshWallet();

    // Persist to transactions table — Realtime subscription in TransactionTable picks this up
    if (user) {
      addTransaction(user.id, {
        type: 'transfer',
        asset: assetSymbol,
        amount: cost,
        status: 'completed',
        notes: `${type} ${amount} ${assetSymbol}`,
      }).catch(() => {});
    }

    const newTrade: Trade = {
      id: result.trade_id ?? Math.random().toString(36).substr(2, 9),
      assetSymbol,
      type,
      amount,
      cost,
      timestamp: new Date().toISOString(),
    };
    setTrades(prev => [newTrade, ...prev]);

    // Capture portfolio snapshot for chart history
    if (user && wallet) {
      const btcP = prices['BTC']?.price ?? 0;
      const ethP = prices['ETH']?.price ?? 0;
      const solP = prices['SOL']?.price ?? 0;
      const totalValue =
        Number(wallet.usd) +
        Number(wallet.btc) * btcP +
        Number(wallet.eth) * ethP +
        Number(wallet.sol) * solP +
        Number(wallet.usdt);
      if (totalValue > 0) {
        insertPortfolioSnapshot(user.id, totalValue).catch(() => {});
      }
    }
  };

  const toggleStrategy = (strategyId: string) => {
    setActiveStrategies(prev => {
      const isActive = prev.includes(strategyId);
      const next = isActive ? prev.filter(id => id !== strategyId) : [...prev, strategyId];
      if (user) {
        const strategy = MOCK_STRATEGIES.find(s => s.id === strategyId);
        upsertStrategy(user.id, strategyId, strategy?.name ?? strategyId, !isActive).catch(() => {});
      }
      return next;
    });
  };

  return (
    <GlobalContext.Provider value={{
      wallet,
      walletLoading,
      walletBalance,
      portfolioValue,
      activeStrategies,
      trades,
      executeTrade,
      toggleStrategy
    }}>
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalContext = () => {
  const context = useContext(GlobalContext);
  if (context === undefined) {
    throw new Error('useGlobalContext must be used within a GlobalProvider');
  }
  return context;
};
