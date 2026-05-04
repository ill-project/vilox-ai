import { create } from 'zustand';
import Decimal from 'decimal.js';
import type { Asset } from './types';

export type TransactionType = 'BUY' | 'SELL';
export type AssetSymbol = 'BTC' | 'ETH' | 'SOL';

export interface Transaction {
  id: string;
  symbol: AssetSymbol;
  type: TransactionType;
  amount: number;
  price: number;
  date: string;
}

interface WalletState {
  balances: {
    USD: number;
    BTC: number;
    ETH: number;
    SOL: number;
  };
  transactions: Transaction[];
  /** Currently focused/selected asset in the markets view. */
  activeAsset: Asset | null;
  setActiveAsset: (asset: Asset | null) => void;
  /** Replace the full transaction list (called on mount from DB). */
  setTransactions: (txs: Transaction[]) => void;
  /** Optimistically update local balances after a confirmed RPC trade. */
  applyConfirmedTrade: (symbol: AssetSymbol, type: TransactionType, amount: number, price: number) => void;
  /** Sync balances from a Realtime wallet row update. */
  syncFromWallet: (usd: number, btc: number, eth: number, sol: number) => void;
}

export const useStore = create<WalletState>((set) => ({
  balances: { USD: 0, BTC: 0, ETH: 0, SOL: 0 },
  transactions: [],
  activeAsset: null,

  setActiveAsset: (asset) => set({ activeAsset: asset }),

  setTransactions: (txs) => set({ transactions: txs }),

  applyConfirmedTrade: (symbol, type, amount, price) => set((state) => {
    const cost     = new Decimal(amount).times(price);
    const feeRate  = new Decimal(import.meta.env.VITE_APP_FEE_RATE ?? '0.001');
    const fee      = cost.times(feeRate);

    const prevUSD  = new Decimal(state.balances.USD);
    const prevAsset = new Decimal(state.balances[symbol]);

    const newUSD   = type === 'BUY'
      ? prevUSD.minus(cost).minus(fee).toNumber()
      : prevUSD.plus(cost).minus(fee).toNumber();
    const newAsset = type === 'BUY'
      ? prevAsset.plus(amount).toNumber()
      : prevAsset.minus(amount).toNumber();

    return {
      balances: { ...state.balances, USD: newUSD, [symbol]: newAsset },
      transactions: [
        { id: Date.now().toString(), symbol, type, amount, price, date: new Date().toISOString() },
        ...state.transactions,
      ],
    };
  }),

  syncFromWallet: (usd, btc, eth, sol) => set((state) => ({
    balances: { ...state.balances, USD: usd, BTC: btc, ETH: eth, SOL: sol },
  })),
}));
