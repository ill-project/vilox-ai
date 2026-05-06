import { useMemo, useEffect, useState } from "react";
import { motion } from "motion/react";
import { Card, cn } from "./shared";
import { useGlobalContext } from "../../context/GlobalContext";
import { useMarketData } from "../../hooks/useMarketData";
import { useAuth } from "../../context/AuthContext";
import { getUserTransactions } from "../../lib/db";
import { AssetLogo } from "../AssetLogo";

const FALLBACK = { BTC: 65000, ETH: 3450, SOL: 145 };

const CRYPTO_NAMES: Record<string, string> = {
  BTC: 'Bitcoin', ETH: 'Ethereum', SOL: 'Solana', XRP: 'XRP',
  BNB: 'BNB', ADA: 'Cardano', AVAX: 'Avalanche', DOGE: 'Dogecoin',
  USDT: 'Tether', USDC: 'USD Coin', USD: 'US Dollar',
};

const STOCK_NAMES: Record<string, string> = {
  AAPL: 'Apple', NVDA: 'NVIDIA', TSLA: 'Tesla', MSFT: 'Microsoft',
  GOOGL: 'Alphabet', AMZN: 'Amazon', META: 'Meta', NFLX: 'Netflix',
  JPM: 'JPMorgan', AMD: 'AMD', V: 'Visa', COIN: 'Coinbase',
  PLTR: 'Palantir', DIS: 'Disney', SHOP: 'Shopify',
};

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-[#1F2937]", className)} />;
}

interface AssetCardProps {
  symbol: string;
  name: string;
  type: 'CRYPTO' | 'STOCK';
  amount: number;
  value: number;
  change: number;
  label: string; // "Balance" or "Shares"
  amountDecimals: number;
  index: number;
}

function AssetCard({ symbol, name, type, amount, value, change, label, amountDecimals, index }: AssetCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      whileHover={{ scale: 1.02, rotateX: 2, rotateY: -2, z: 10 }}
      style={{ perspective: 1000 }}
    >
      <Card className="p-5 flex flex-col justify-between h-full bg-gradient-to-b from-[#111827] to-[#0E1628] hover:border-[#4F7CFF]/30 transition-colors">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <AssetLogo symbol={symbol} type={type} size="md" />
            <div>
              <h3 className="font-semibold text-white">{name}</h3>
              <p className="text-[#9CA3AF] text-sm">{symbol}</p>
            </div>
          </div>
          {change !== 0 && (
            <div className={`text-sm font-medium px-2 py-0.5 rounded-full ${change > 0 ? "text-[#00FFA3] bg-[#00FFA3]/10" : "text-[#FF4D4D] bg-[#FF4D4D]/10"}`}>
              {change > 0 ? '+' : ''}{change.toFixed(2)}%
            </div>
          )}
        </div>
        <div>
          <p className="text-[#9CA3AF] text-sm mb-1">{label}</p>
          <div className="flex justify-between items-end">
            <span className="text-2xl font-bold text-white tracking-tight">
              {amount.toLocaleString(undefined, { minimumFractionDigits: amountDecimals, maximumFractionDigits: amountDecimals })}{' '}
              <span className="text-lg text-[#9CA3AF] font-medium">{symbol}</span>
            </span>
          </div>
          <p className="text-[#4F7CFF] text-sm font-medium mt-1">
            ≈ ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </Card>
    </motion.div>
  );
}

interface StockPosition {
  symbol: string;
  netAmount: number;
  avgPrice: number;
}

export function WalletAssets() {
  const { wallet, walletLoading: isLoading } = useGlobalContext();
  const { user } = useAuth();
  const prices = useMarketData();

  const btcPrice = prices['BTC']?.price    ?? FALLBACK.BTC;
  const ethPrice = prices['ETH']?.price    ?? FALLBACK.ETH;
  const solPrice = prices['SOL']?.price    ?? FALLBACK.SOL;
  const btc24h   = prices['BTC']?.change24h ?? 0;
  const eth24h   = prices['ETH']?.change24h ?? 0;
  const sol24h   = prices['SOL']?.change24h ?? 0;

  // ── Stock / ETF positions from trade history ──────────────────────────────
  const [stockPositions, setStockPositions] = useState<StockPosition[]>([]);
  const [stocksLoading, setStocksLoading] = useState(true);

  useEffect(() => {
    if (!user) { setStocksLoading(false); return; }
    // Use transactions table (works) instead of trades table (RLS blocks client inserts)
    // notes format: "BUY 1.5 TSLA" or "SELL 0.5 TSLA" where the number is share count
    const STOCK_SYMBOLS = new Set(Object.keys(STOCK_NAMES));
    getUserTransactions(user.id)
      .then((rows) => {
        const map = new Map<string, { net: number; totalCost: number; totalBought: number }>();
        for (const r of rows as Record<string, unknown>[]) {
          if (r.type !== 'transfer') continue;
          const sym = String(r.asset ?? '').toUpperCase();
          if (!STOCK_SYMBOLS.has(sym)) continue;
          // Parse notes: "BUY 1.5 TSLA"
          const parts = String(r.notes ?? '').trim().split(/\s+/);
          const side = parts[0]?.toUpperCase();
          const shares = parseFloat(parts[1] ?? '') || 0;
          if (!side || shares <= 0) continue;
          const cur = map.get(sym) ?? { net: 0, totalCost: 0, totalBought: 0 };
          if (side === 'BUY') {
            cur.net         += shares;
            cur.totalCost   += Number(r.amount) || 0; // USD cost
            cur.totalBought += shares;
          } else if (side === 'SELL') {
            cur.net -= shares;
          }
          map.set(sym, cur);
        }
        const positions: StockPosition[] = [];
        for (const [symbol, data] of map) {
          if (data.net > 0.00001) {
            positions.push({
              symbol,
              netAmount: data.net,
              avgPrice: data.totalBought > 0 ? data.totalCost / data.totalBought : 0,
            });
          }
        }
        setStockPositions(positions);
      })
      .catch(() => {})
      .finally(() => setStocksLoading(false));
  }, [user]);

  // ── Crypto wallet assets ──────────────────────────────────────────────────
  const cryptoAssets = useMemo(() => {
    if (!wallet) return [];
    const built = [];
    const usdTotal = Number(wallet.usd ?? 0) + Number(wallet.usdt ?? 0);
    if (usdTotal >= 0.01)           built.push({ symbol: 'USD',  name: 'US Dollar', amount: usdTotal,             value: usdTotal,                 change: 0,      amountDecimals: 2 });
    if (Number(wallet.btc ?? 0) > 0) built.push({ symbol: 'BTC', name: 'Bitcoin',   amount: Number(wallet.btc),   value: Number(wallet.btc) * btcPrice, change: btc24h, amountDecimals: 6 });
    if (Number(wallet.eth ?? 0) > 0) built.push({ symbol: 'ETH', name: 'Ethereum',  amount: Number(wallet.eth),   value: Number(wallet.eth) * ethPrice, change: eth24h, amountDecimals: 6 });
    if (Number(wallet.sol ?? 0) > 0) built.push({ symbol: 'SOL', name: 'Solana',    amount: Number(wallet.sol),   value: Number(wallet.sol) * solPrice, change: sol24h, amountDecimals: 4 });
    return built;
  }, [wallet, btcPrice, ethPrice, solPrice, btc24h, eth24h, sol24h]);

  return (
    <div className="space-y-10">
      {/* ── Crypto Wallet Assets ── */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white tracking-tight">Wallet Assets</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)
            : cryptoAssets.map((asset, index) => (
                <AssetCard
                  key={asset.symbol}
                  index={index}
                  type="CRYPTO"
                  label="Balance"
                  {...asset}
                />
              ))}
        </div>
      </div>

      {/* ── Stock & ETF Positions ── */}
      {(stocksLoading || stockPositions.length > 0) && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white tracking-tight">Stock &amp; ETF Positions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {stocksLoading
              ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)
              : stockPositions.map((pos, index) => {
                  const livePrice = prices[pos.symbol]?.price ?? pos.avgPrice;
                  const change24h = prices[pos.symbol]?.change24h ?? 0;
                  const value = pos.netAmount * livePrice;
                  const pnlPct = pos.avgPrice > 0 ? ((livePrice - pos.avgPrice) / pos.avgPrice) * 100 : 0;
                  return (
                    <AssetCard
                      key={pos.symbol}
                      index={index}
                      symbol={pos.symbol}
                      name={STOCK_NAMES[pos.symbol] ?? pos.symbol}
                      type="STOCK"
                      amount={pos.netAmount}
                      value={value}
                      change={change24h || pnlPct}
                      label="Shares"
                      amountDecimals={pos.netAmount % 1 === 0 ? 0 : 4}
                    />
                  );
                })}
          </div>
        </div>
      )}
    </div>
  );
}
