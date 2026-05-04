import { useMemo } from "react";
import { motion } from "motion/react";
import { Card, cn } from "./shared";
import { Bitcoin, Coins, DollarSign, TrendingUp } from "lucide-react";
import { useGlobalContext } from "../../context/GlobalContext";
import { useMarketData } from "../../hooks/useMarketData";

interface AssetProps {
  name: string;
  symbol: string;
  amount: number;
  value: number;
  change: number;
  icon: React.ReactNode;
  iconBg: string;
}

const FALLBACK = { BTC: 65000, ETH: 3450, SOL: 145 };

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-[#1F2937]", className)} />;
}

export function WalletAssets() {
  const { wallet, walletLoading: isLoading } = useGlobalContext();
  const prices = useMarketData();

  const btcPrice = prices['BTC']?.price    ?? FALLBACK.BTC;
  const ethPrice = prices['ETH']?.price    ?? FALLBACK.ETH;
  const solPrice = prices['SOL']?.price    ?? FALLBACK.SOL;
  const btc24h   = prices['BTC']?.change24h ?? 0;
  const eth24h   = prices['ETH']?.change24h ?? 0;
  const sol24h   = prices['SOL']?.change24h ?? 0;

  const assets = useMemo<AssetProps[]>(() => {
    if (!wallet) return [];
    const built: AssetProps[] = [];
    const usdTotal = Number(wallet.usd ?? 0) + Number(wallet.usdt ?? 0);
    if (usdTotal >= 0.01) {
      built.push({ name: "US Dollar", symbol: "USD", amount: usdTotal, value: usdTotal, change: 0, icon: <DollarSign className="text-[#00FFA3]" />, iconBg: "bg-[#00FFA3]/10" });
    }
    if (Number(wallet.btc ?? 0) > 0) {
      built.push({ name: "Bitcoin", symbol: "BTC", amount: Number(wallet.btc), value: Number(wallet.btc) * btcPrice, change: btc24h, icon: <Bitcoin className="text-[#F7931A]" />, iconBg: "bg-[#F7931A]/10" });
    }
    if (Number(wallet.eth ?? 0) > 0) {
      built.push({ name: "Ethereum", symbol: "ETH", amount: Number(wallet.eth), value: Number(wallet.eth) * ethPrice, change: eth24h, icon: <Coins className="text-[#627EEA]" />, iconBg: "bg-[#627EEA]/10" });
    }
    if (Number(wallet.sol ?? 0) > 0) {
      built.push({ name: "Solana", symbol: "SOL", amount: Number(wallet.sol), value: Number(wallet.sol) * solPrice, change: sol24h, icon: <TrendingUp className="text-[#9945FF]" />, iconBg: "bg-[#9945FF]/10" });
    }
    return built;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet, btcPrice, ethPrice, solPrice, btc24h, eth24h, sol24h]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white tracking-tight">Wallet Assets</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))
          : assets.map((asset, index) => (
              <motion.div
                key={asset.symbol}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={{ scale: 1.02, rotateX: 2, rotateY: -2, z: 10 }}
                style={{ perspective: 1000 }}
              >
                <Card className="p-5 flex flex-col justify-between h-full bg-gradient-to-b from-[#111827] to-[#0E1628] hover:border-[#4F7CFF]/30 transition-colors">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${asset.iconBg}`}>
                        {asset.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{asset.name}</h3>
                        <p className="text-[#9CA3AF] text-sm">{asset.symbol}</p>
                      </div>
                    </div>
                    {asset.change !== 0 && (
                      <div className={`text-sm font-medium px-2 py-0.5 rounded-full ${asset.change > 0 ? "text-[#00FFA3] bg-[#00FFA3]/10" : "text-[#FF4D4D] bg-[#FF4D4D]/10"}`}>
                        {asset.change > 0 ? '+' : ''}{asset.change}%
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-[#9CA3AF] text-sm mb-1">Balance</p>
                    <div className="flex justify-between items-end">
                      <span className="text-2xl font-bold text-white tracking-tight">
                        {asset.amount.toLocaleString(undefined, { minimumFractionDigits: asset.symbol === 'USD' ? 2 : 0, maximumFractionDigits: asset.symbol === 'USD' ? 2 : 6 })}{' '}
                        <span className="text-lg text-[#9CA3AF] font-medium">{asset.symbol}</span>
                      </span>
                    </div>
                    <p className="text-[#4F7CFF] text-sm font-medium mt-1">
                      ≈ ${asset.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </Card>
              </motion.div>
            ))
        }
      </div>
    </div>
  );
}
