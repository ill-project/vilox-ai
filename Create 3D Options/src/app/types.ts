export type Signal = 'BUY' | 'SELL' | 'HOLD';

export interface AssetHistory {
  time: string;
  price: number;
}

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: 'CRYPTO' | 'STOCK';
  price: number;
  change24h: number;
  signal: Signal;
  confidence: number;
  lastUpdated: string;
  isElite: boolean;
  live: boolean;
  volume: string;
  history: AssetHistory[];
}
