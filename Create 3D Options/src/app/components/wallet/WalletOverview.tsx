import React from "react";
import { ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Info, RefreshCw } from "lucide-react";
import { Button, Card, cn } from "./shared";
import { motion } from "motion/react";
import { useGlobalContext } from "../../context/GlobalContext";
import { useMarketData } from "../../hooks/useMarketData";

interface WalletOverviewProps {
  onDeposit: () => void;
  onWithdraw: () => void;
  onTransfer: () => void;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-[#1F2937]", className)} />;
}

const WalletOverview = ({ onDeposit, onWithdraw, onTransfer }: WalletOverviewProps) => {
  const { wallet, walletLoading: isLoading } = useGlobalContext();
  const [refreshing, setRefreshing] = React.useState(false);
  const prices = useMarketData();
  const handleRefresh = () => {
    setRefreshing(true);
    window.location.reload();
  };

  // Same calculation as Dashboard + GlobalContext — only the 4 wallet columns
  const btcPrice = prices['BTC']?.price ?? 65000;
  const ethPrice = prices['ETH']?.price ?? 3450;
  const solPrice = prices['SOL']?.price ?? 145;

  const usdCash    = wallet ? Number(wallet.usd)  : 0;
  const usdtCash   = wallet ? Number(wallet.usdt) : 0;
  const cash       = usdCash + usdtCash;                         // Available Cash = USD + USDT
  const cryptoValue = wallet
    ? Number(wallet.btc) * btcPrice
    + Number(wallet.eth) * ethPrice
    + Number(wallet.sol) * solPrice
    : 0;                                                          // Invested = crypto only
  const total  = cash + cryptoValue;
  const locked = wallet ? Number(wallet.locked_usd) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="p-6 md:p-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-gradient-to-br from-[#111827] to-[#0B0F1A] border-[#1F2937]">
        <button
          onClick={handleRefresh}
          title="Refresh Wallet"
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white/60 hover:text-white transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
        <div className="space-y-6 flex-1">
          <div>
            <p className="text-[#9CA3AF] text-sm font-medium mb-1">Total Wallet Balance</p>
            {isLoading ? (
              <Skeleton className="h-12 w-56 mt-1" />
            ) : (
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white flex items-center gap-3 flex-wrap">
                ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-[#00FFA3] text-lg font-medium bg-[#00FFA3]/10 px-2.5 py-1 rounded-full border border-[#00FFA3]/20 flex items-center">
                  +2.4%
                </span>
              </h1>
            )}
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-4">
            <div>
              <p className="text-[#9CA3AF] text-sm mb-1">Available Cash</p>
              {isLoading ? <Skeleton className="h-7 w-28" /> : (
                <p className="text-xl font-semibold text-white">
                  ${cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
            </div>
            <div className="w-px h-10 bg-[#1F2937] hidden md:block" />
            <div>
              <p className="text-[#9CA3AF] text-sm mb-1">Invested</p>
              {isLoading ? <Skeleton className="h-7 w-28" /> : (
                <p className="text-xl font-semibold text-white">
                  ${cryptoValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
            </div>
            <div className="w-px h-10 bg-[#1F2937] hidden md:block" />
            <div className="group relative">
              <p className="text-[#9CA3AF] text-sm mb-1 flex items-center gap-1.5 cursor-help">
                Locked
                <Info size={14} className="text-[#4F7CFF]" />
              </p>
              {isLoading ? <Skeleton className="h-7 w-20" /> : (
                <p className="text-xl font-semibold text-white">
                  ${locked.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
              <div className="absolute left-0 bottom-full mb-2 w-48 p-2 bg-[#111827] border border-[#1F2937] rounded-lg text-xs text-[#9CA3AF] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                Locked funds are held in open trade positions.
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3">
          <Button onClick={onDeposit} className="w-full sm:w-auto px-6 py-3.5 shadow-[0_0_20px_rgba(79,124,255,0.15)] group">
            <ArrowDownLeft size={18} className="mr-2 group-hover:-translate-y-0.5 group-hover:-translate-x-0.5 transition-transform" />
            Deposit
          </Button>
          <Button onClick={onWithdraw} variant="secondary" className="w-full sm:w-auto px-6 py-3.5 group">
            <ArrowUpRight size={18} className="mr-2 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
            Withdraw
          </Button>
          <Button onClick={onTransfer} variant="secondary" className="w-full sm:w-auto px-6 py-3.5">
            <ArrowRightLeft size={18} className="mr-2" />
            Transfer
          </Button>
        </div>
      </Card>

      {/* Crypto Holdings Breakdown */}
      {(Number(wallet?.btc ?? 0) > 0 || Number(wallet?.eth ?? 0) > 0 || Number(wallet?.sol ?? 0) > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="p-6 bg-gradient-to-br from-[#111827] to-[#0B0F1A] border-[#1F2937]">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#4C6FFF]"></div>
              Your Crypto Holdings
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[
                { asset: 'BTC', balance: Number(wallet?.btc ?? 0), price: btcPrice },
                { asset: 'ETH', balance: Number(wallet?.eth ?? 0), price: ethPrice },
                { asset: 'SOL', balance: Number(wallet?.sol ?? 0), price: solPrice },
              ].filter(h => h.balance > 0).map((holding) => (
                <div
                  key={holding.asset}
                  className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{holding.asset}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-[#00FFA3]/10 text-[#00FFA3]">Live</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-white text-sm font-semibold">
                      {holding.balance.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })}
                    </p>
                    <p className="text-[#9CA3AF] text-xs">
                      ${(holding.balance * holding.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[#6B7280] text-xs">
                      @ ${holding.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}

export { WalletOverview };
export default WalletOverview;
