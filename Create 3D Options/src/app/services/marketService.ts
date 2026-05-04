/**
 * marketService.ts
 * ----------------
 * WebSocket-first market data service.
 * Priority: Binance WS → CoinGecko REST → Supabase cache → mock fallback.
 * For stocks: AlphaVantage GLOBAL_QUOTE polling every 60 s → mock fallback.
 *
 * Consumers: useMarketData hook (do not call this service directly from components).
 */

import { fetchMarketCache } from './supabaseService';
import { MOCK_ASSETS } from '../mockData';

// â”€â”€ Config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const BINANCE_WS_BASE = import.meta.env.VITE_BINANCE_WS_URL || 'wss://stream.binance.com:9443';
const ENABLE_WEBSOCKET = import.meta.env.VITE_ENABLE_WEBSOCKET !== 'false';
const COINGECKO_API_KEY = import.meta.env.VITE_COINGECKO_API_KEY || '';
const ALPHA_VANTAGE_KEY = import.meta.env.VITE_ALPHA_VANTAGE_KEY || '';

// Mapping from our symbol → Binance stream name suffix
const BINANCE_SYMBOLS: Record<string, string> = {
  BTC: 'btcusdt',
  ETH: 'ethusdt',
  SOL: 'solusdt',
  XRP: 'xrpusdt',
  BNB: 'bnbusdt',
  ADA: 'adausdt',
  AVAX: 'avaxusdt',
  DOGE: 'dogeusdt',
  DOT: 'dotusdt',
  MATIC: 'maticusdt',
  LINK: 'linkusdt',
  SHIB: 'shibusdt',
  TRX: 'trxusdt',
  QNT: 'qntusdt',
  USDT: 'usdtusdt', // For USDT price (usually stable at 1)
  USDC: 'usdcusdt',
  UNI: 'uniusdt',
  ATOM: 'atomusdt',
  LTC: 'ltcusdt',
  NEAR: 'nearusdt',
  OP: 'opusdt',
  ARB: 'arbusdt',
};

// Mapping from our symbol → CoinGecko coin id
const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  XRP: 'ripple',
  BNB: 'binancecoin',
  ADA: 'cardano',
  AVAX: 'avalanche-2',
  DOGE: 'dogecoin',
  DOT: 'polkadot',
  MATIC: 'polygon-ecosystem-token',
  LINK: 'chainlink',
  SHIB: 'shiba-inu',
  TRX: 'tron',
  QNT: 'quant-network',
  USDT: 'tether',
  USDC: 'usd-coin',
  UNI: 'uniswap',
  ATOM: 'cosmos',
  LTC: 'litecoin',
  NEAR: 'near',
  OP: 'optimism',
  ARB: 'arbitrum',
};

/** Stock symbols served by AlphaVantage. */
const STOCK_SYMBOLS = ['GOOGL', 'TSLA', 'NVDA', 'AAPL', 'MSFT'] as const;
/** Stagger individual stock requests to stay inside the 5 req/min free-tier limit. */
const AV_STAGGER_MS = 13_000;

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface PriceMap {
  [symbol: string]: {
    price: number;
    change24h: number;
    source: 'ws' | 'rest' | 'cache' | 'mock';
  };
}

type PriceListener = (prices: PriceMap) => void;

// â”€â”€ Internal state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

let currentPrices: PriceMap = {};
let ws: WebSocket | null = null;
let wsRetries = 0;
const MAX_WS_RETRIES = 5;
const listeners = new Set<PriceListener>();
let restPollInterval: ReturnType<typeof setInterval> | null = null;

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function notify() {
  listeners.forEach((fn) => fn({ ...currentPrices }));
}

function buildInitialMockPrices(): PriceMap {
  const map: PriceMap = {};
  for (const asset of MOCK_ASSETS) {
    map[asset.symbol] = { price: asset.price, change24h: asset.change24h, source: 'mock' };
  }
  return map;
}

// â”€â”€ CoinGecko REST (60-second polling, respects free-tier rate limits) â”€â”€â”€â”€â”€â”€â”€â”€

async function fetchCoinGeckoPrices(): Promise<boolean> {
  try {
    const ids = Object.values(COINGECKO_IDS).join(',');
    const headers: HeadersInit = COINGECKO_API_KEY
      ? { 'x-cg-pro-api-key': COINGECKO_API_KEY }
      : {};
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      { headers, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return false;
    const data: Record<string, { usd: number; usd_24h_change: number }> = await res.json();

    for (const [sym, cgId] of Object.entries(COINGECKO_IDS)) {
      if (data[cgId]) {
        currentPrices[sym] = {
          price: data[cgId].usd,
          change24h: data[cgId].usd_24h_change ?? 0,
          source: 'rest',
        };
      }
    }
    notify();
    return true;
  } catch {
    return false;
  }
}

// â”€â”€ Supabase cache fallback â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function loadCacheFallback() {
  try {
    const cache = await fetchMarketCache();
    for (const [sym, row] of Object.entries(cache)) {
      if (!currentPrices[sym] || currentPrices[sym].source === 'mock') {
        currentPrices[sym] = { price: row.price, change24h: row.change_24h, source: 'cache' };
      }
    }
    notify();
  } catch {
    // silently ignore — mock data is already in currentPrices
  }
}

// â”€â”€ AlphaVantage stock quotes (staggered to respect 5 req/min free tier) â”€â”€â”€â”€â”€

async function fetchStockQuote(symbol: string): Promise<void> {
  if (!ALPHA_VANTAGE_KEY) return;
  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!resp.ok) return;

    const json = await resp.json() as {
      'Global Quote'?: {
        '05. price'?: string;
        '10. change percent'?: string;
      };
      Note?: string;
      Information?: string;
    };

    // Rate-limit or info message — skip silently
    if (json.Note || json.Information) return;

    const quote = json['Global Quote'];
    if (!quote?.['05. price']) return;

    const price = parseFloat(quote['05. price']);
    const changeStr = (quote['10. change percent'] ?? '0%').replace('%', '');
    const change24h = parseFloat(changeStr);

    if (!isFinite(price) || price <= 0) return;

    currentPrices[symbol] = { price, change24h, source: 'rest' };
    notify();
  } catch {
    // network error — keep existing mock/cached price
  }
}

/** Stagger-fetch all stock symbols, then schedule 60 s re-poll. */
let stockPollTimeout: ReturnType<typeof setTimeout> | null = null;
let stockTimers: ReturnType<typeof setTimeout>[] = [];

function startStockPolling() {
  if (!ALPHA_VANTAGE_KEY) return; // no key — stay on mock prices

  // Clear any pending stagger timers
  stockTimers.forEach(clearTimeout);
  stockTimers = [];

  STOCK_SYMBOLS.forEach((sym, idx) => {
    const t = setTimeout(() => fetchStockQuote(sym), idx * AV_STAGGER_MS);
    stockTimers.push(t);
  });

  // Schedule next full refresh a safe margin after all fetches complete
  const totalStaggerMs = STOCK_SYMBOLS.length * AV_STAGGER_MS;
  stockPollTimeout = setTimeout(startStockPolling, 60_000 + totalStaggerMs);
}

// â”€â”€ Binance WebSocket â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function connectBinanceWS() {
  if (!ENABLE_WEBSOCKET) return;

  const streams = Object.values(BINANCE_SYMBOLS)
    .map((s) => `${s}@ticker`)
    .join('/');
  const url = `${BINANCE_WS_BASE}/stream?streams=${streams}`;

  ws = new WebSocket(url);

  ws.onopen = () => {
    wsRetries = 0;
    // Stop REST polling while WS is alive
    if (restPollInterval) {
      clearInterval(restPollInterval);
      restPollInterval = null;
    }
  };

  ws.onmessage = (event: MessageEvent) => {
    try {
      const frame = JSON.parse(event.data as string);
      const ticker = frame?.data;
      if (!ticker || !ticker.s) return;

      // Find our symbol from the Binance stream symbol (e.g. BTCUSDT → BTC)
      const sym = Object.entries(BINANCE_SYMBOLS).find(
        ([, v]) => v.toUpperCase() === ticker.s
      )?.[0];
      if (!sym) return;

      currentPrices[sym] = {
        price: parseFloat(ticker.c),      // current price
        change24h: parseFloat(ticker.P),   // price change %
        source: 'ws',
      };
      notify();
    } catch {
      // malformed frame — ignore
    }
  };

  ws.onerror = () => {
    ws?.close();
  };

  ws.onclose = () => {
    ws = null;
    if (wsRetries < MAX_WS_RETRIES) {
      wsRetries++;
      const delay = Math.min(1000 * 2 ** wsRetries, 30000);
      setTimeout(connectBinanceWS, delay);
    } else {
      // WebSocket permanently failed — fall back to REST polling
      startRestPolling();
    }
  };
}

function startRestPolling() {
  if (restPollInterval) return;
  fetchCoinGeckoPrices();
  restPollInterval = setInterval(() => {
    fetchCoinGeckoPrices().then((ok) => {
      if (!ok) loadCacheFallback();
    });
  }, 60_000);
}

// â”€â”€ Public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Add a listener and receive current prices immediately. */
export function subscribePrices(listener: PriceListener): () => void {
  listeners.add(listener);
  // Immediately emit current state to the new subscriber
  if (Object.keys(currentPrices).length > 0) {
    listener({ ...currentPrices });
  }
  return () => listeners.delete(listener);
}

/** Bootstrap the service. Call once at app startup (or first hook mount). */
let started = false;
export async function startMarketService() {
  if (started) return;
  started = true;

  // 1. Seed with mock data so the UI renders immediately
  currentPrices = buildInitialMockPrices();
  notify();

  // 2. Try to load Supabase cache (near-instant)
  await loadCacheFallback();

  // 3. Start primary data source
  if (ENABLE_WEBSOCKET) {
    connectBinanceWS();
    // Also fetch REST once now so non-WS assets (QNT) get live prices
    fetchCoinGeckoPrices();
  } else {
    startRestPolling();
  }

  // 4. Start AlphaVantage stock polling (independent of crypto feed)
  startStockPolling();
}

/** Tear down all connections. Call on app unmount (optional). */
export function stopMarketService() {
  ws?.close();
  ws = null;
  if (restPollInterval) {
    clearInterval(restPollInterval);
    restPollInterval = null;
  }
  if (stockPollTimeout) {
    clearTimeout(stockPollTimeout);
    stockPollTimeout = null;
  }
  stockTimers.forEach(clearTimeout);
  stockTimers = [];
  started = false;
  listeners.clear();
  currentPrices = {};
}
