import { Asset } from './types';

// Helper to generate sample price history for charts
const generateHistory = (base: number, volatility: number) => {
  return Array.from({ length: 24 }).map((_, i) => {
    const time = `${i}:00`;
    const change = (Math.random() - 0.5) * volatility;
    return { time, price: base + change };
  });
};

export const MOCK_ASSETS: Asset[] = [
  // â”€â”€ Core Crypto â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id: '1',  symbol: 'BTC',   name: 'Bitcoin',          type: 'CRYPTO', price: 64230.50,  change24h:  2.4,  signal: 'BUY',  confidence: 88, lastUpdated: 'Just now', isElite: false, live: true,  volume: '$34.2B', history: generateHistory(64000, 500) },
  { id: '2',  symbol: 'ETH',   name: 'Ethereum',         type: 'CRYPTO', price: 3450.20,   change24h: -1.2,  signal: 'HOLD', confidence: 65, lastUpdated: '1m ago',   isElite: false, live: true,  volume: '$12.1B', history: generateHistory(3500, 100) },
  { id: '3',  symbol: 'SOL',   name: 'Solana',           type: 'CRYPTO', price: 145.80,    change24h:  5.8,  signal: 'BUY',  confidence: 92, lastUpdated: 'Just now', isElite: false, live: true,  volume: '$4.5B',  history: generateHistory(140, 10) },
  { id: '4',  symbol: 'QNT',   name: 'Quant',            type: 'CRYPTO', price: 110.45,    change24h: 12.4,  signal: 'BUY',  confidence: 96, lastUpdated: '1s ago',   isElite: true,  live: true,  volume: '$850M',  history: generateHistory(100, 15) },
  { id: '14', symbol: 'XRP',   name: 'Ripple',           type: 'CRYPTO', price: 0.5820,    change24h:  1.9,  signal: 'BUY',  confidence: 75, lastUpdated: 'Just now', isElite: false, live: true,  volume: '$2.8B',  history: generateHistory(0.58, 0.02) },
  { id: '15', symbol: 'BNB',   name: 'BNB',              type: 'CRYPTO', price: 398.40,    change24h:  0.7,  signal: 'HOLD', confidence: 68, lastUpdated: '2m ago',   isElite: false, live: true,  volume: '$1.6B',  history: generateHistory(395, 8) },
  { id: '16', symbol: 'DOGE',  name: 'Dogecoin',         type: 'CRYPTO', price: 0.1620,    change24h:  3.2,  signal: 'BUY',  confidence: 70, lastUpdated: '30s ago',  isElite: false, live: true,  volume: '$1.1B',  history: generateHistory(0.16, 0.005) },
  { id: '17', symbol: 'ADA',   name: 'Cardano',          type: 'CRYPTO', price: 0.4580,    change24h: -0.8,  signal: 'HOLD', confidence: 60, lastUpdated: '1m ago',   isElite: false, live: true,  volume: '$490M',  history: generateHistory(0.46, 0.01) },
  { id: '18', symbol: 'AVAX',  name: 'Avalanche',        type: 'CRYPTO', price: 36.20,     change24h:  4.1,  signal: 'BUY',  confidence: 82, lastUpdated: 'Just now', isElite: false, live: true,  volume: '$620M',  history: generateHistory(35, 2) },
  { id: '19', symbol: 'LINK',  name: 'Chainlink',        type: 'CRYPTO', price: 14.80,     change24h:  2.6,  signal: 'BUY',  confidence: 78, lastUpdated: '10s ago',  isElite: false, live: true,  volume: '$480M',  history: generateHistory(14.5, 0.5) },
  { id: '20', symbol: 'DOT',   name: 'Polkadot',         type: 'CRYPTO', price: 7.24,      change24h: -1.4,  signal: 'HOLD', confidence: 58, lastUpdated: '2m ago',   isElite: true,  live: true,  volume: '$310M',  history: generateHistory(7.3, 0.2) },
  { id: '21', symbol: 'SHIB',  name: 'Shiba Inu',        type: 'CRYPTO', price: 0.000021,  change24h:  6.8,  signal: 'BUY',  confidence: 64, lastUpdated: '5s ago',   isElite: false, live: true,  volume: '$780M',  history: generateHistory(0.00002, 0.000001) },
  { id: '22', symbol: 'TRX',   name: 'TRON',             type: 'CRYPTO', price: 0.1240,    change24h:  0.4,  signal: 'HOLD', confidence: 55, lastUpdated: '3m ago',   isElite: false, live: true,  volume: '$290M',  history: generateHistory(0.124, 0.003) },
  { id: '23', symbol: 'MATIC', name: 'Polygon',          type: 'CRYPTO', price: 0.8420,    change24h:  3.7,  signal: 'BUY',  confidence: 74, lastUpdated: 'Just now', isElite: false, live: true,  volume: '$430M',  history: generateHistory(0.84, 0.02) },
  // â”€â”€ Core Stocks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  { id: '9',  symbol: 'GOOGL', name: 'Alphabet Inc.',    type: 'STOCK',  price: 154.22,    change24h:  1.8,  signal: 'BUY',  confidence: 94, lastUpdated: 'Just now', isElite: true,  live: true,  volume: '$2.4B',  history: generateHistory(150, 4) },
  { id: '10', symbol: 'AAPL',  name: 'Apple Inc.',       type: 'STOCK',  price: 169.30,    change24h: -0.4,  signal: 'HOLD', confidence: 65, lastUpdated: '2m ago',   isElite: false, live: true,  volume: '$4.1B',  history: generateHistory(170, 3) },
  { id: '11', symbol: 'NVDA',  name: 'NVIDIA Corp.',     type: 'STOCK',  price: 880.08,    change24h:  4.8,  signal: 'BUY',  confidence: 99, lastUpdated: 'Just now', isElite: true,  live: true,  volume: '$18.3B', history: generateHistory(870, 25) },
  { id: '12', symbol: 'MSFT',  name: 'Microsoft Corp.',  type: 'STOCK',  price: 410.54,    change24h:  0.8,  signal: 'BUY',  confidence: 86, lastUpdated: '1m ago',   isElite: false, live: true,  volume: '$3.5B',  history: generateHistory(408, 5) },
  { id: '13', symbol: 'TSLA',  name: 'Tesla Inc.',       type: 'STOCK',  price: 175.22,    change24h: -3.2,  signal: 'SELL', confidence: 81, lastUpdated: '10s ago',  isElite: true,  live: false, volume: '$5.7B',  history: generateHistory(178, 8) },
  { id: '24', symbol: 'AMZN',  name: 'Amazon.com Inc.',  type: 'STOCK',  price: 192.40,    change24h:  1.2,  signal: 'BUY',  confidence: 89, lastUpdated: 'Just now', isElite: false, live: true,  volume: '$4.8B',  history: generateHistory(190, 5) },
  { id: '25', symbol: 'META',  name: 'Meta Platforms',   type: 'STOCK',  price: 522.18,    change24h:  2.1,  signal: 'BUY',  confidence: 91, lastUpdated: '30s ago',  isElite: false, live: true,  volume: '$3.2B',  history: generateHistory(518, 8) },
  { id: '26', symbol: 'NFLX',  name: 'Netflix Inc.',     type: 'STOCK',  price: 648.75,    change24h: -0.6,  signal: 'HOLD', confidence: 62, lastUpdated: '2m ago',   isElite: true,  live: true,  volume: '$1.4B',  history: generateHistory(650, 10) },
  { id: '27', symbol: 'AMD',   name: 'AMD',              type: 'STOCK',  price: 162.30,    change24h:  3.5,  signal: 'BUY',  confidence: 85, lastUpdated: '15s ago',  isElite: false, live: true,  volume: '$2.1B',  history: generateHistory(160, 4) },
  { id: '28', symbol: 'JPM',   name: 'JPMorgan Chase',   type: 'STOCK',  price: 198.60,    change24h:  0.5,  signal: 'HOLD', confidence: 70, lastUpdated: '1m ago',   isElite: true,  live: true,  volume: '$1.8B',  history: generateHistory(197, 3) },
  { id: '29', symbol: 'V',     name: 'Visa Inc.',        type: 'STOCK',  price: 275.40,    change24h:  0.9,  signal: 'BUY',  confidence: 80, lastUpdated: 'Just now', isElite: false, live: true,  volume: '$1.2B',  history: generateHistory(273, 3) },
  { id: '30', symbol: 'COIN',  name: 'Coinbase Global',  type: 'STOCK',  price: 224.80,    change24h:  5.4,  signal: 'BUY',  confidence: 87, lastUpdated: '5s ago',   isElite: true,  live: true,  volume: '$980M',  history: generateHistory(220, 8) },
  { id: '31', symbol: 'PLTR',  name: 'Palantir Tech.',   type: 'STOCK',  price: 22.60,     change24h:  2.8,  signal: 'BUY',  confidence: 76, lastUpdated: '20s ago',  isElite: false, live: true,  volume: '$620M',  history: generateHistory(22, 0.8) },
];

export const MOCK_STRATEGIES = [
  { id: 'strat-1', name: 'Quantum Momentum', confidence: 94, risk: 'High', winRate: '78.2%', avgProfit: '+14.5%', maxDrawdown: '-8.2%', description: 'Leverages neural networks to detect micro-momentum shifts in high-liquidity assets.' },
  { id: 'strat-2', name: 'Stable Accumulation', confidence: 88, risk: 'Low', winRate: '85.4%', avgProfit: '+4.2%', maxDrawdown: '-2.1%', description: 'Slow, calculated dollar-cost averaging into blue-chip assets during verified dips.' },
  { id: 'strat-3', name: 'Arbitrage Scanner', confidence: 76, risk: 'Medium', winRate: '62.0%', avgProfit: '+1.8%', maxDrawdown: '-0.5%', description: 'Simultaneously cross-references order books across 40+ exchanges to secure risk-free gaps.' },
  { id: 'strat-4', name: 'Sentiment Alpha', confidence: 91, risk: 'High', winRate: '71.5%', avgProfit: '+22.1%', maxDrawdown: '-15.4%', description: 'Aggregates global news sentiment and social velocity to front-run emotional market swings.' }
];

// Expanded pool used for hourly strategy rotation in the AI Lab
export const ALL_STRATEGIES = [
  ...MOCK_STRATEGIES,
  { id: 'strat-5', name: 'Mean Reversion Engine', confidence: 82, risk: 'Low', winRate: '79.3%', avgProfit: '+3.8%', maxDrawdown: '-1.9%', description: 'Identifies statistically overextended moves and fades them back to equilibrium with precision exits.' },
  { id: 'strat-6', name: 'Breakout Hunter', confidence: 87, risk: 'High', winRate: '69.1%', avgProfit: '+19.4%', maxDrawdown: '-12.7%', description: 'Monitors consolidation zones and enters aggressively on confirmed breakouts with volume confirmation.' },
  { id: 'strat-7', name: 'Volume Flow Analysis', confidence: 79, risk: 'Medium', winRate: '74.8%', avgProfit: '+6.3%', maxDrawdown: '-3.4%', description: 'Tracks institutional order flow through dark pool and block trade signatures for directional bias.' },
  { id: 'strat-8', name: 'Macro Cycle Tracker', confidence: 85, risk: 'Low', winRate: '88.2%', avgProfit: '+5.1%', maxDrawdown: '-2.8%', description: 'Aligns positions with macro economic cycles using Fed policy, yield curves, and sector rotation signals.' },
];

export const MOCK_AI_SIGNALS = [
  { id: 'sig-1', symbol: 'NVDA', type: 'STOCK', action: 'BUY', confidence: 99, risk: 'Medium', price: 880.08 },
  { id: 'sig-2', symbol: 'BTC', type: 'CRYPTO', action: 'BUY', confidence: 92, risk: 'High', price: 64230.50 },
  { id: 'sig-3', symbol: 'TSLA', type: 'STOCK', action: 'SELL', confidence: 86, risk: 'High', price: 175.22 },
  { id: 'sig-4', symbol: 'ETH', type: 'CRYPTO', action: 'HOLD', confidence: 65, risk: 'Medium', price: 3450.20 },
  { id: 'sig-5', symbol: 'SOL', type: 'CRYPTO', action: 'BUY', confidence: 88, risk: 'High', price: 145.80 }
];

export const MOCK_PORTFOLIO_HISTORY = Array.from({ length: 30 }).map((_, i) => ({
  day: i,
  value: 3000000 + (Math.sin(i / 3) * 200000) + (i * 15000)
}));
