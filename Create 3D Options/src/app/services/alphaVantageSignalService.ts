/**
 * alphaVantageSignalService.ts
 * ----------------------------
 * Fetches live stock quotes from AlphaVantage GLOBAL_QUOTE endpoint.
 * Derives BUY / SELL / HOLD signals from the daily change %.
 *
 * Free tier: 25 requests / day, 5 requests / minute.
 * All 5 stocks are fetched concurrently — well within 5 req/min.
 * Caller should cache results and refresh no more than every 5 minutes
 * to stay within the daily quota.
 */

import type { SignalRow } from './supabaseService';

const AV_KEY = (import.meta.env.VITE_ALPHA_VANTAGE_KEY as string) || '';

const STOCKS: { symbol: string; name: string }[] = [
  { symbol: 'NVDA',  name: 'NVIDIA Corp'    },
  { symbol: 'AAPL',  name: 'Apple Inc.'     },
  { symbol: 'TSLA',  name: 'Tesla Inc.'     },
  { symbol: 'MSFT',  name: 'Microsoft Corp' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.'  },
  { symbol: 'AMZN',  name: 'Amazon.com'     },
  { symbol: 'META',  name: 'Meta Platforms' },
];

// â”€â”€ Signal derivation from daily change % â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Stocks have lower intraday swings than crypto — tighter thresholds.
function deriveStockSignal(changePercent: number, price: number): {
  action: SignalRow['action'];
  confidence: number;
  risk: SignalRow['risk'];
  reason: string;
} {
  const confidence = Math.min(99, Math.round(55 + Math.abs(changePercent) * 5));
  // Risk based on absolute price move significance
  const risk: SignalRow['risk'] = Math.abs(changePercent) > 4 ? 'High'
    : Math.abs(changePercent) > 1.5 ? 'Medium'
    : 'Low';

  let action: SignalRow['action'];
  let reason: string;
  const sign = changePercent >= 0 ? '+' : '';

  if (changePercent > 3.5) {
    action = 'STRONG BUY';
    reason = `Strong daily gain of ${sign}${changePercent.toFixed(2)}%. Exceptional momentum — institutional buying pressure detected.`;
  } else if (changePercent > 1) {
    action = 'BUY';
    reason = `Positive daily move of ${sign}${changePercent.toFixed(2)}%. Trend constructive, risk/reward favors entry.`;
  } else if (changePercent < -3.5) {
    action = 'STRONG SELL';
    reason = `Heavy selloff: ${sign}${changePercent.toFixed(2)}% today. Bearish momentum — consider reducing exposure.`;
  } else if (changePercent < -1) {
    action = 'SELL';
    reason = `Declining ${sign}${changePercent.toFixed(2)}% today. Short-term downward pressure, risk elevated.`;
  } else {
    action = 'HOLD';
    reason = `Consolidating at ${sign}${changePercent.toFixed(2)}% today. No clear directional edge — await confirmation.`;
  }

  return { action, confidence, risk, reason };
}

// â”€â”€ Single stock fetch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function fetchStockQuote(symbol: string): Promise<SignalRow | null> {
  if (!AV_KEY) return null;

  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${AV_KEY}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return null;

  const data = await res.json();

  // Rate limit response — AlphaVantage returns 200 with a Note/Information field
  if (data['Note'] || data['Information']) return null;

  const quote = data['Global Quote'];
  if (!quote || !quote['05. price']) return null;

  const price = parseFloat(quote['05. price']);
  const changePercent = parseFloat((quote['10. change percent'] as string).replace('%', ''));
  if (isNaN(price) || isNaN(changePercent)) return null;

  const { action, confidence, risk, reason } = deriveStockSignal(changePercent, price);

  return {
    id:         `stock-${symbol.toLowerCase()}`,
    symbol,
    asset_type: 'STOCK',
    action,
    confidence,
    risk,
    price,
    reason,
    expires_at: null,
    created_at: new Date().toISOString(),
    // No image_url — stocks use letter fallback in AssetLogo
  };
}

// â”€â”€ Public fetch — all stocks concurrently â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function fetchStockSignals(): Promise<SignalRow[]> {
  if (!AV_KEY) return [];

  const results = await Promise.allSettled(STOCKS.map(s => fetchStockQuote(s.symbol)));
  return results
    .filter((r): r is PromiseFulfilledResult<SignalRow> => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value);
}
