import { useEffect, useRef, useState } from 'react';
import {
  fetchSignals,
  subscribeToSignals,
  unsubscribe,
  SignalRow,
} from '../services/supabaseService';
import { fetchCoinGeckoSignals } from '../services/coinGeckoService';
import { fetchStockSignals } from '../services/alphaVantageSignalService';
import { MOCK_AI_SIGNALS } from '../mockData';

const CRYPTO_REFRESH_MS = 60_000;       // CoinGecko: every 60 s (no rate limit)
const STOCK_REFRESH_MS  = 5 * 60_000;   // AlphaVantage: every 5 min to conserve 25 req/day

function mockToSignalRows(): SignalRow[] {
  return MOCK_AI_SIGNALS.map((s) => ({
    id: s.id,
    symbol: s.symbol,
    asset_type: s.type as 'CRYPTO' | 'STOCK' | 'ETF',
    action: s.action as SignalRow['action'],
    confidence: s.confidence,
    risk: s.risk as SignalRow['risk'],
    price: s.price,
    reason: null,
    expires_at: null,
    created_at: new Date().toISOString(),
  }));
}

// Merge new rows into existing list, dedup by id, sort by confidence desc
// Filters out any rows where price is null/0 to prevent render crashes
function mergeSignals(existing: SignalRow[], incoming: SignalRow[]): SignalRow[] {
  const map = new Map(existing.map(s => [s.id, s]));
  incoming.forEach(s => map.set(s.id, s));
  return Array.from(map.values())
    .filter(s => s.price != null && Number(s.price) > 0)
    .sort((a, b) => b.confidence - a.confidence);
}

export function useSignals() {
  const [signals, setSignals] = useState<SignalRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const cryptoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stockTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // â”€â”€ Crypto refresh (CoinGecko) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const loadCrypto = async () => {
    try {
      const rows = await fetchCoinGeckoSignals();
      if (rows.length > 0) {
        setSignals(prev => mergeSignals(prev, rows));
        setLastUpdated(new Date());
      }
    } catch {
      // CoinGecko failed — fall back to Supabase then mock
      try {
        const rows = await fetchSignals();
        const fallback = rows.length > 0 ? rows : mockToSignalRows();
        setSignals(prev => mergeSignals(prev, fallback));
        setLastUpdated(new Date());
      } catch {
        setSignals(prev => prev.length > 0 ? prev : mockToSignalRows());
      }
    }
  };

  // â”€â”€ Stock refresh (AlphaVantage) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const loadStocks = async () => {
    try {
      const rows = await fetchStockSignals();
      if (rows.length > 0) {
        setSignals(prev => mergeSignals(prev, rows));
      }
    } catch {
      // Rate-limited or offline — keep existing stock rows if any
    }
  };

  useEffect(() => {
    // Initial parallel fetch of both sources
    Promise.all([loadCrypto(), loadStocks()])
      .finally(() => setIsLoading(false));

    // Recurring crypto timer
    cryptoTimerRef.current = setInterval(loadCrypto, CRYPTO_REFRESH_MS);
    // Recurring stock timer (less frequent to preserve API quota)
    stockTimerRef.current  = setInterval(loadStocks, STOCK_REFRESH_MS);

    // Supabase Realtime for admin-pushed signal overrides
    if (import.meta.env.VITE_ENABLE_REALTIME === 'false') {
      return () => {
        if (cryptoTimerRef.current) clearInterval(cryptoTimerRef.current);
        if (stockTimerRef.current)  clearInterval(stockTimerRef.current);
      };
    }

    const channel = subscribeToSignals((updated) => {
      setSignals((prev) => {
        const idx = prev.findIndex((s) => s.id === updated.id);
        if (idx >= 0) {
          const next = [...prev]; next[idx] = updated; return next;
        }
        return mergeSignals(prev, [updated]);
      });
    });

    return () => {
      if (cryptoTimerRef.current) clearInterval(cryptoTimerRef.current);
      if (stockTimerRef.current)  clearInterval(stockTimerRef.current);
      unsubscribe(channel);
    };
  }, []);

  return { signals, isLoading, lastUpdated };
}
