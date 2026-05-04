import React, { useEffect, useRef, useCallback, useState } from 'react';
import { createChart, CandlestickSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, Time } from 'lightweight-charts';

interface MarketChartProps {
  symbol: string;
  type?: 'CRYPTO' | 'STOCK';
  height?: number;
}

// â”€â”€ Binance (crypto) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const BINANCE_SYMBOLS: Record<string, string> = {
  BTC: 'btcusdt', ETH: 'ethusdt', SOL: 'solusdt', QNT: 'qntusdt',
  XRP: 'xrpusdt', BNB: 'bnbusdt', DOGE: 'dogeusdt', ADA: 'adausdt',
  AVAX: 'avaxusdt', LINK: 'linkusdt', DOT: 'dotusdt', SHIB: 'shibusdt',
  TRX: 'trxusdt', MATIC: 'maticusdt', NEAR: 'nearusdt', ATOM: 'atomusdt',
  LTC: 'ltcusdt', UNI: 'uniusdt', ARB: 'arbusdt', OP: 'opusdt',
};

// â”€â”€ Kraken (primary fallback — very reliable, no geo-blocks) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const KRAKEN_PAIRS: Record<string, string> = {
  BTC: 'XXBTZUSD', ETH: 'XETHZUSD', SOL: 'SOLUSD', XRP: 'XXRPZUSD',
  BNB: 'BNBUSD', ADA: 'ADAUSD', DOGE: 'XDGZUSD', AVAX: 'AVAXUSD',
  LINK: 'LINKUSD', DOT: 'DOTUSD', MATIC: 'MATICUSD', ATOM: 'ATOMUSD',
  LTC: 'XLTCZUSD', UNI: 'UNIUSD', NEAR: 'NEARUSD', TRX: 'TRXUSD',
  QNT: 'QNTUSD', ARB: 'ARBUSD', OP: 'OPUSD',
};

// â”€â”€ CoinGecko ID map (second fallback) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', QNT: 'quant-network',
  XRP: 'ripple', BNB: 'binancecoin', DOGE: 'dogecoin', ADA: 'cardano',
  AVAX: 'avalanche-2', LINK: 'chainlink', DOT: 'polkadot', SHIB: 'shiba-inu',
  TRX: 'tron', MATIC: 'matic-network', NEAR: 'near', ATOM: 'cosmos',
  LTC: 'litecoin', UNI: 'uniswap', ARB: 'arbitrum', OP: 'optimism',
};

function klinesToCandles(klines: number[][]): CandlestickData<Time>[] {
  return klines.map((k) => ({
    time: Math.floor(k[0] / 1000) as Time,
    open: parseFloat(String(k[1])),
    high: parseFloat(String(k[2])),
    low: parseFloat(String(k[3])),
    close: parseFloat(String(k[4])),
  }));
}

async function fetchBinanceCandles(binanceSym: string): Promise<CandlestickData<Time>[]> {
  const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSym.toUpperCase()}&interval=1m&limit=120`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(6_000) });
  if (!resp.ok) throw new Error(`Binance ${resp.status}`);
  const raw: number[][] = await resp.json();
  return klinesToCandles(raw);
}

async function fetchKrakenCandles(pair: string): Promise<CandlestickData<Time>[]> {
  const url = `https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=1`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  if (!resp.ok) throw new Error(`Kraken ${resp.status}`);
  const json = await resp.json() as { result?: Record<string, number[][]>; error?: string[] };
  if (json.error?.length) throw new Error(`Kraken: ${json.error[0]}`);
  const result = json.result ?? {};
  // Result key may differ from requested pair (e.g. XXBTZUSD → XBT/USD)
  const key = Object.keys(result).find(k => k !== 'last');
  if (!key) throw new Error('Kraken: no data key');
  return result[key]
    .map((k) => ({
      time: k[0] as Time,
      open: parseFloat(String(k[1])),
      high: parseFloat(String(k[2])),
      low: parseFloat(String(k[3])),
      close: parseFloat(String(k[4])),
    }))
    .filter((c) => c.open > 0)
    .sort((a, b) => (a.time as number) - (b.time as number))
    .slice(-120);
}

async function fetchCoinGeckoCandles(coinId: string): Promise<CandlestickData<Time>[]> {
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=usd&days=1`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!resp.ok) throw new Error(`CoinGecko ${resp.status}`);
  const raw: number[][] = await resp.json();
  return raw
    .map((k) => ({
      time: Math.floor(k[0] / 1000) as Time,
      open: k[1], high: k[2], low: k[3], close: k[4],
    }))
    .filter((c) => c.open > 0)
    .sort((a, b) => (a.time as number) - (b.time as number));
}

// â”€â”€ AlphaVantage (stocks) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const AV_KEY = (import.meta.env.VITE_ALPHA_VANTAGE_KEY as string) || '';
const AV_BASE = 'https://www.alphavantage.co/query';

interface AVTimeSeries {
  '1. open': string;
  '2. high': string;
  '3. low': string;
  '4. close': string;
}

async function fetchStockCandles(symbol: string): Promise<CandlestickData<Time>[]> {
  if (!AV_KEY) return [];
  try {
    const url = `${AV_BASE}?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=1min&outputsize=compact&apikey=${AV_KEY}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!resp.ok) return [];

    const json = await resp.json() as {
      'Time Series (1min)'?: Record<string, AVTimeSeries>;
      Note?: string;
      Information?: string;
    };

    if (json.Note || json.Information) return [];
    const series = json['Time Series (1min)'];
    if (!series) return [];

    return Object.entries(series)
      .slice(0, 100)
      .map(([dateStr, v]) => ({
        time: Math.floor(new Date(dateStr).getTime() / 1000) as Time,
        open: parseFloat(v['1. open']),
        high: parseFloat(v['2. high']),
        low: parseFloat(v['3. low']),
        close: parseFloat(v['4. close']),
      }))
      .filter((c) => isFinite(c.open) && c.open > 0)
      .sort((a, b) => (a.time as number) - (b.time as number));
  } catch {
    return [];
  }
}

// â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const MarketChart: React.FC<MarketChartProps> = ({
  symbol,
  type = 'CRYPTO',
  height = 320,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const avPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [chartStatus, setChartStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  const binanceSym = BINANCE_SYMBOLS[symbol.toUpperCase()];
  const krakenPair = KRAKEN_PAIRS[symbol.toUpperCase()];
  const coinGeckoId = COINGECKO_IDS[symbol.toUpperCase()];
  const isCrypto = type === 'CRYPTO' && !!(binanceSym || krakenPair || coinGeckoId);
  const isStock = type === 'STOCK';
  const hasAvKey = !!AV_KEY;

  const seedCryptoCandles = useCallback(async () => {
    if (!isCrypto || !seriesRef.current) return;
    let candles: CandlestickData<Time>[] = [];

    // 1. Try Binance
    if (binanceSym) {
      try {
        candles = await fetchBinanceCandles(binanceSym);
      } catch (e) {
        console.warn('[Chart] Binance failed:', e);
      }
    }

    // 2. Try Kraken
    if (candles.length === 0 && krakenPair) {
      try {
        candles = await fetchKrakenCandles(krakenPair);
      } catch (e) {
        console.warn('[Chart] Kraken failed:', e);
      }
    }

    // 3. Try CoinGecko
    if (candles.length === 0 && coinGeckoId) {
      try {
        candles = await fetchCoinGeckoCandles(coinGeckoId);
      } catch (e) {
        console.warn('[Chart] CoinGecko failed:', e);
      }
    }

    if (candles.length > 0 && seriesRef.current) {
      seriesRef.current.setData(candles);
      setChartStatus('ok');
    } else {
      console.error('[Chart] All sources failed for', symbol);
      setChartStatus('error');
    }
  }, [isCrypto, binanceSym, krakenPair, coinGeckoId, symbol]);

  const connectCryptoWs = useCallback(() => {
    if (!binanceSym) return;
    wsRef.current?.close();
    wsRef.current = null;
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${binanceSym}@kline_1m`);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as {
          k: { t: number; o: string; h: string; l: string; c: string };
        };
        const k = msg.k;
        seriesRef.current?.update({
          time: Math.floor(k.t / 1000) as Time,
          open: parseFloat(k.o),
          high: parseFloat(k.h),
          low: parseFloat(k.l),
          close: parseFloat(k.c),
        });
      } catch { /* ignore malformed frames */ }
    };
    ws.onerror = () => ws.close();
    wsRef.current = ws;
  }, [binanceSym]);

  const seedAndPollStockCandles = useCallback(async () => {
    if (!isStock || !seriesRef.current) return;
    const candles = await fetchStockCandles(symbol);
    if (candles.length > 0 && seriesRef.current) {
      seriesRef.current.setData(candles);
      setChartStatus('ok');
    } else {
      setChartStatus('error');
    }
    if (avPollRef.current) clearTimeout(avPollRef.current);
    avPollRef.current = setTimeout(seedAndPollStockCandles, 60_000);
  }, [isStock, symbol]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    setChartStatus('loading');

    chartRef.current?.remove();
    chartRef.current = null;
    seriesRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    if (avPollRef.current) {
      clearTimeout(avPollRef.current);
      avPollRef.current = null;
    }

    // Use offsetWidth for accurate measurement; fall back to 600
    const initWidth = container.offsetWidth || container.getBoundingClientRect().width || 600;

    const chart = createChart(container, {
      width: initWidth,
      height,
      layout: {
        background: { color: 'transparent' },
        textColor: 'rgba(255,255,255,0.5)',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.08)' },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.08)',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#00FFA3',
      downColor: '#FF4D4D',
      borderUpColor: '#00FFA3',
      borderDownColor: '#FF4D4D',
      wickUpColor: '#00FFA3',
      wickDownColor: '#FF4D4D',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    if (isCrypto) {
      seedCryptoCandles().then(() => connectCryptoWs());
    } else if (isStock) {
      seedAndPollStockCandles();
    }

    // Resize when modal animation settles or window changes
    const ro = new ResizeObserver(() => {
      if (!container || !chartRef.current) return;
      const w = container.offsetWidth;
      if (w > 0) chartRef.current.resize(w, height);
    });
    ro.observe(container);

    // Also resize after a short delay to catch spring animation end
    const resizeTimer = setTimeout(() => {
      if (container && chartRef.current) {
        const w = container.offsetWidth;
        if (w > 0) chartRef.current.resize(w, height);
      }
    }, 350);

    return () => {
      ro.disconnect();
      clearTimeout(resizeTimer);
      if (avPollRef.current) clearTimeout(avPollRef.current);
      wsRef.current?.close();
      wsRef.current = null;
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [symbol, height, isCrypto, isStock, seedCryptoCandles, connectCryptoWs, seedAndPollStockCandles]);

  const showNoKeyNotice = isStock && !hasAvKey;

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-[#0B0F1A]/60 border border-white/[0.06]">
      {/* Loading spinner — shown until data arrives */}
      {chartStatus === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#4C6FFF]/30 border-t-[#4C6FFF] animate-spin" />
          <p className="text-white/30 text-xs font-mono">Loading chart…</p>
        </div>
      )}
      {/* Error state */}
      {chartStatus === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-2">
          <p className="text-white/30 text-xs font-mono uppercase tracking-widest">Chart unavailable</p>
          <p className="text-white/20 text-[10px]">Check your connection</p>
        </div>
      )}
      {/* No AV key notice for stocks */}
      {showNoKeyNotice && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[#0B0F1A]/80 rounded-xl gap-2">
          <p className="text-white/40 text-xs font-mono uppercase tracking-widest text-center px-4">
            Add VITE_ALPHA_VANTAGE_KEY to .env for live stock charts
          </p>
        </div>
      )}
      <div ref={containerRef} className="w-full" style={{ height }} />
    </div>
  );
};

