/**
 * coinGeckoService.ts
 * -------------------
 * Fetches live crypto market data from the CoinGecko public API (no key required).
 * Derives BUY / SELL / STRONG BUY / STRONG SELL / HOLD signals from real price
 * momentum (1h + 24h percentage change) and maps the result to the SignalRow shape
 * used throughout the app.
 *
 * Rate limit: ~10–30 req/min on the free tier Ã¢â‚¬" we poll every 60 s.
 */

import type { SignalRow } from './supabaseService';

// â”€â”€ Coins to track (CoinGecko IDs → display symbol) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const COINS: { id: string; symbol: string; asset_type: 'CRYPTO' }[] = [
  { id: 'bitcoin',        symbol: 'BTC',   asset_type: 'CRYPTO' },
  { id: 'ethereum',       symbol: 'ETH',   asset_type: 'CRYPTO' },
  { id: 'solana',         symbol: 'SOL',   asset_type: 'CRYPTO' },
  { id: 'ripple',         symbol: 'XRP',   asset_type: 'CRYPTO' },
  { id: 'binancecoin',    symbol: 'BNB',   asset_type: 'CRYPTO' },
  { id: 'avalanche-2',    symbol: 'AVAX',  asset_type: 'CRYPTO' },
  { id: 'chainlink',      symbol: 'LINK',  asset_type: 'CRYPTO' },
  { id: 'dogecoin',       symbol: 'DOGE',  asset_type: 'CRYPTO' },
  { id: 'cardano',        symbol: 'ADA',   asset_type: 'CRYPTO' },
  { id: 'polkadot',       symbol: 'DOT',   asset_type: 'CRYPTO' },
  { id: 'matic-network',  symbol: 'MATIC', asset_type: 'CRYPTO' },
  { id: 'uniswap',        symbol: 'UNI',   asset_type: 'CRYPTO' },
  { id: 'cosmos',         symbol: 'ATOM',  asset_type: 'CRYPTO' },
  { id: 'litecoin',       symbol: 'LTC',   asset_type: 'CRYPTO' },
  { id: 'near',           symbol: 'NEAR',  asset_type: 'CRYPTO' },
];

// â”€â”€ CoinGecko response shape (only fields we care about) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface CGCoin {
  id: string;
  symbol: string;
  image: string;
  current_price: number;
  price_change_percentage_1h_in_currency: number | null;
  price_change_percentage_24h: number | null;
  total_volume: number;
  high_24h: number;
  low_24h: number;
}

// â”€â”€ Signal derivation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Score = (1h change Ã— 2) + 24h change   (1h weighted higher for recency)
// Thresholds:  > 4 → STRONG BUY  |  > 1.5 → BUY  |  < -4 → STRONG SELL  |  < -1.5 → SELL
// Confidence is clamped to [55, 99] based on score magnitude.
// Risk is driven by 24-h volatility ((high âˆ’ low) / low).

function deriveSignal(coin: CGCoin): {
  action: SignalRow['action'];
  confidence: number;
  risk: SignalRow['risk'];
  reason: string;
} {
  const ch1h  = coin.price_change_percentage_1h_in_currency ?? 0;
  const ch24h = coin.price_change_percentage_24h ?? 0;
  const score = ch1h * 2 + ch24h;

  // Confidence: starts at 55, scales with |score| up to 99
  const confidence = Math.min(99, Math.round(55 + Math.abs(score) * 3.5));

  // Risk from intraday swing
  const swing = coin.low_24h > 0 ? (coin.high_24h - coin.low_24h) / coin.low_24h * 100 : 0;
  const risk: SignalRow['risk'] = swing > 6 ? 'High' : swing > 2.5 ? 'Medium' : 'Low';

  let action: SignalRow['action'];
  let reason: string;

  if (score > 4) {
    action = 'STRONG BUY';
    reason = `Strong upside momentum: +${ch1h.toFixed(2)}% (1h) / +${ch24h.toFixed(2)}% (24h). Volume confirms directional bias.`;
  } else if (score > 1.5) {
    action = 'BUY';
    reason = `Positive momentum: +${ch1h.toFixed(2)}% (1h) / +${ch24h.toFixed(2)}% (24h). Trend remains constructive.`;
  } else if (score < -4) {
    action = 'STRONG SELL';
    reason = `Sharp decline: ${ch1h.toFixed(2)}% (1h) / ${ch24h.toFixed(2)}% (24h). Bearish pressure accelerating.`;
  } else if (score < -1.5) {
    action = 'SELL';
    reason = `Downward pressure: ${ch1h.toFixed(2)}% (1h) / ${ch24h.toFixed(2)}% (24h). Risk/reward unfavorable short-term.`;
  } else {
    action = 'HOLD';
    reason = `Neutral range-bound movement. 1h: ${ch1h.toFixed(2)}%, 24h: ${ch24h.toFixed(2)}%. Waiting for directional confirmation.`;
  }

  return { action, confidence, risk, reason };
}

// â”€â”€ Public fetch function â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function fetchCoinGeckoSignals(): Promise<SignalRow[]> {
  const ids = COINS.map(c => c.id).join(',');
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=1h,24h&order=market_cap_desc&per_page=20&page=1&sparkline=false`;

  const res = await fetch(url, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`CoinGecko ${res.status}: ${res.statusText}`);
  }

  const data: CGCoin[] = await res.json();

  // Map to SignalRow, preserving the display symbol from our COINS list
  return data.map<SignalRow>((coin) => {
    const meta = COINS.find(c => c.id === coin.id);
    const { action, confidence, risk, reason } = deriveSignal(coin);
    return {
      id:         coin.id,
      symbol:     meta?.symbol ?? coin.symbol.toUpperCase(),
      asset_type: 'CRYPTO',
      action,
      confidence,
      risk,
      price:      coin.current_price,
      reason,
      expires_at: null,
      created_at: new Date().toISOString(),
      image_url:  coin.image,
    };
  });
}
