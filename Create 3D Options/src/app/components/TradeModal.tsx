import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, AlertTriangle, TrendingUp, TrendingDown, ArrowRight, ArrowDownLeft, ArrowLeft,
  Activity, ShieldCheck, Fingerprint, RefreshCw, AlertCircle, Wallet,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import Decimal from 'decimal.js';
import { useStore, AssetSymbol } from '../store';
import { useGlobalContext } from '../context/GlobalContext';
import { useMarketData } from '../hooks/useMarketData';
import { calcFee, calcBuyCost, calcSellProceeds, toUSD, FEE_RATE } from '../services/tradingService';
import { AssetLogo } from './AssetLogo';
import { MarketChart } from './MarketChart';
import { cn } from './Card3D';

export interface TradeModalAsset {
  id: string;
  name: string;
  price: string | number;
  signal: 'BUY' | 'STRONG BUY' | 'SELL' | 'HOLD';
  risk?: 'Low' | 'Medium' | 'High';
  confidence: string | number;
  entryPrice?: string;
  takeProfit?: string;
  stopLoss?: string;
  // Extended fields from Asset (Define Theme)
  symbol?: string;
  type?: 'CRYPTO' | 'STOCK';
  change24h?: number;
  volume?: string;
  history?: { time: string; price: number }[];
}

interface TradeModalProps {
  asset: TradeModalAsset | null;
  onClose: () => void;
}

function parsePrice(price: string): number {
  return parseFloat(price.replace(/[$,]/g, '')) || 0;
}

function deriveRisk(confidence: string | number): 'Low' | 'Medium' | 'High' {
  const val = typeof confidence === 'number' ? confidence : parseFloat(String(confidence)) || 50;
  if (val >= 80) return 'Low';
  if (val >= 60) return 'Medium';
  return 'High';
}

const isKnownSymbol = (s: string): s is AssetSymbol =>
  s === 'BTC' || s === 'ETH' || s === 'SOL';

export const TradeModal: React.FC<TradeModalProps> = ({ asset, onClose }) => {
  const navigate = useNavigate();
  const { applyConfirmedTrade } = useStore();
  const { executeTrade: contextExecuteTrade, wallet, walletLoading } = useGlobalContext();
  const [tradeError, setTradeError] = useState<string | null>(null);
  const marketPrices = useMarketData();
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [amount, setAmount] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [securityHash, setSecurityHash] = useState('');

  useEffect(() => {
    if (!asset) return;
    setSide(asset.signal === 'SELL' ? 'SELL' : 'BUY');
    setAmount('');
    setSuccess(false);
    setIsExecuting(false);
    setTradeError(null);
    setSecurityHash(
      Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase()
    );
  }, [asset]);

  if (!asset) return null;

  const tradingSymbol = asset.symbol ?? asset.id;

  // Extract numeric price from PriceMap entry; fall back to asset's own price field
  const rawPrice: number = marketPrices[tradingSymbol]?.price
    ? marketPrices[tradingSymbol].price
    : typeof asset.price === 'number'
      ? asset.price
      : parsePrice(asset.price as string);

  const effectiveRisk = asset.risk ?? deriveRisk(asset.confidence);
  const confidenceDisplay =
    typeof asset.confidence === 'number' ? `${asset.confidence}%` : String(asset.confidence);

  const hasLogo = !!asset.type;

  // Use real wallet balances when available
  const availableUSD = wallet !== null ? (Number(wallet.usd) || 0) : 0;
  const availableAsset = wallet !== null
    ? (Number((wallet as unknown as Record<string, unknown>)[tradingSymbol.toLowerCase()] ?? 0) || 0)
    : 0;

  // Total crypto value across all holdings (BTC, ETH, SOL)
  const btcPrice = marketPrices['BTC']?.price ?? 0;
  const ethPrice = marketPrices['ETH']?.price ?? 0;
  const solPrice = marketPrices['SOL']?.price ?? 0;
  const totalCryptoValue = wallet !== null
    ? (Number(wallet.btc) || 0) * btcPrice
    + (Number(wallet.eth) || 0) * ethPrice
    + (Number(wallet.sol) || 0) * solPrice
    : 0;
  const hasAnyFunds = availableUSD >= 0.01 || totalCryptoValue >= 0.01 || availableAsset > 0;

  const numericAmount = parseFloat(amount) || 0;
  const decAmount = new Decimal(numericAmount || 0);
  const decPrice  = new Decimal(rawPrice || 0);
  const feeD  = numericAmount > 0 ? calcFee(decAmount.toNumber(), decPrice.toNumber()) : new Decimal(0);
  const totalD = numericAmount > 0
    ? (side === 'BUY' ? calcBuyCost(decAmount.toNumber(), decPrice.toNumber()) : calcSellProceeds(decAmount.toNumber(), decPrice.toNumber()))
    : new Decimal(0);
  const fee   = feeD.toNumber();
  const total = totalD.toNumber();

  const quickFill = (pct: number) => {
    if (!rawPrice) return;
    if (side === 'BUY') {
      const spendable = availableUSD >= 0.01 ? availableUSD : totalCryptoValue;
      setAmount(((spendable * pct) / rawPrice).toFixed(6));
    } else {
      setAmount((availableAsset * pct).toFixed(6));
    }
  };

  const handleConfirm = async () => {
    if (numericAmount <= 0) return;
    // Client-side balance check before hitting the trade engine
    if (side === 'BUY') {
      const totalCost = numericAmount * rawPrice * (1 + FEE_RATE.toNumber());
      if (availableUSD < totalCost) {
        if (totalCryptoValue >= totalCost) {
          setTradeError(
            `You need $${totalCost.toFixed(2)} USD to buy ${tradingSymbol}. ` +
            `You have ~$${totalCryptoValue.toFixed(2)} in crypto but $${availableUSD.toFixed(2)} USD. ` +
            `Sell some of your crypto first, then return here to complete this trade.`
          );
        } else {
          setTradeError(
            `Insufficient funds. Need $${totalCost.toFixed(2)} — you have $${availableUSD.toFixed(2)} USD.`
          );
        }
        return;
      }
    } else {
      if (availableAsset < numericAmount) {
        setTradeError(`Insufficient ${tradingSymbol}. You have ${availableAsset.toFixed(6)} but tried to sell ${numericAmount.toFixed(6)}.`);
        return;
      }
    }
    setIsExecuting(true);
    setTradeError(null);
    try {
      // Only call contextExecuteTrade, which now handles RPC and wallet refresh
      await contextExecuteTrade(tradingSymbol, side, numericAmount, totalD.toNumber());
      // Update optimistic local store with Decimal-precise values
      if (isKnownSymbol(tradingSymbol)) {
        applyConfirmedTrade(tradingSymbol as AssetSymbol, side, numericAmount, rawPrice);
      }
      setSuccess(true);
    } catch (err) {
      setTradeError((err as Error).message);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <AnimatePresence>
      {asset && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center pt-[57px] md:pt-4 px-4 pb-4 sm:px-6 sm:pb-6 backdrop-blur-sm bg-[#0F111A]/80"
          onClick={(e) => e.target === e.currentTarget && !isExecuting && !success && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="relative w-full max-w-5xl flex flex-col lg:flex-row bg-[#0F111A]/95 border border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-[#4C6FFF]/10 max-h-[95vh] overflow-y-auto"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 z-50 w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* ─── Left Panel: Chart ─── */}
            <div className="w-full lg:w-[55%] p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col bg-white/[0.02]">
              {/* Back button */}
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 text-white/50 hover:text-white text-xs font-semibold mb-8 w-fit transition-colors group px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                Back to Markets
              </button>

              {/* Asset Header */}
              <div className="flex items-center gap-4 mb-6 mt-2">
                {hasLogo ? (
                  <AssetLogo symbol={tradingSymbol} type={asset.type!} size="xl" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-[#4C6FFF]/20 border border-[#4C6FFF]/40 flex items-center justify-center font-bold text-xl text-[#4C6FFF]">
                    {tradingSymbol[0]}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-2xl font-bold text-white tracking-tight">{asset.name}</h2>
                    {asset.type && (
                      <span className="px-2 py-0.5 rounded bg-white/10 text-white/60 font-mono text-xs tracking-widest">
                        {asset.type}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-white/50 text-sm font-mono">
                    <span>{tradingSymbol}/USD</span>
                    {asset.volume && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-white/30" />
                        <span>Vol: {asset.volume}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="mb-6">
                <div className="text-3xl font-mono text-white tracking-tighter">
                  ${rawPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                </div>
                {asset.change24h !== undefined && (
                  <div className={cn('text-sm mt-1 font-mono', asset.change24h >= 0 ? 'text-green-400' : 'text-red-400')}>
                    {asset.change24h >= 0 ? '+' : ''}{Number(asset.change24h).toFixed(2)}% (24h)
                  </div>
                )}
              </div>

              {/* Chart */}
              <div className="flex-1 w-full min-h-[220px] relative mt-6">
                <MarketChart symbol={tradingSymbol} type={asset.type ?? 'CRYPTO'} height={260} />
              </div>
            </div>

            {/* ─── Right Panel: Trade Form ─── */}
            <div className="w-full lg:w-[45%] p-6 lg:p-8 flex flex-col relative bg-[#0F111A]">
              {/* Loading / Success Overlay */}
              <AnimatePresence>
                {(isExecuting || success) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0F111A]/95 backdrop-blur-md p-8"
                  >
                    {isExecuting ? (
                      <>
                        <div className="relative w-20 h-20 mb-6">
                          <div className="absolute inset-0 border-4 border-[#4C6FFF]/20 rounded-full" />
                          <div className="absolute inset-0 border-4 border-[#4C6FFF] rounded-full border-t-transparent animate-spin" />
                          <Fingerprint className="absolute inset-0 m-auto w-9 h-9 text-[#4C6FFF] animate-pulse" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Confirming Trade</h3>
                        <div className="flex items-center gap-2 text-[#4C6FFF] font-mono text-xs mb-4">
                          <RefreshCw className="w-3 h-3 animate-spin" /> Awaiting Network Confirmation
                        </div>
                        <div className="w-full bg-white/5 border border-white/10 rounded-lg p-3 font-mono text-[10px] text-white/50 break-all text-center">
                          TX: {securityHash}
                        </div>
                      </>
                    ) : (
                      <>
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                          className="w-20 h-20 mb-6 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.3)]"
                        >
                          <ShieldCheck className="w-10 h-10 text-green-400" />
                        </motion.div>
                        <h3 className="text-2xl font-bold text-white mb-2">Trade Executed!</h3>
                        <p className="text-white/50 text-center mb-6 text-sm">
                          {side === 'BUY' ? 'Bought' : 'Sold'}{' '}
                          <span className="text-white font-medium">{numericAmount.toFixed(6)} {tradingSymbol}</span>{' '}
                          at{' '}
                          <span className="text-white font-medium">
                            ${rawPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </span>
                        </p>
                        <div className="flex gap-3 w-full">
                          <button
                            onClick={() => { onClose(); navigate('/app/wallet'); }}
                            className="flex-1 py-3 rounded-xl bg-[#4C6FFF]/15 border border-[#4C6FFF]/30 text-[#4C6FFF] font-medium hover:bg-[#4C6FFF]/25 transition-colors text-sm"
                          >
                            View in Wallet
                          </button>
                          <button
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-medium transition-colors text-sm"
                          >
                            Continue Trading
                          </button>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Fund Account Gate: shown only when wallet has no funds at all */}
              {!walletLoading && !hasAnyFunds && !isExecuting && !success && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0F111A]/97 backdrop-blur-sm p-8 text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-[#4C6FFF]/20 border border-[#4C6FFF]/40 flex items-center justify-center mb-5">
                    <Wallet className="w-8 h-8 text-[#4C6FFF]" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Fund Your Account</h3>
                  <p className="text-white/50 text-sm mb-8 max-w-xs leading-relaxed">
                    Deposit funds or choose a subscription plan to start trading{' '}
                    <span className="text-white font-medium">{tradingSymbol}</span> with Vilox AI.
                  </p>
                  <div className="flex flex-col gap-3 w-full max-w-xs">
                    <button
                      onClick={() => { onClose(); navigate('/app/wallet', { state: { depositIntent: true } }); }}
                      className="w-full py-3.5 rounded-xl bg-[#4C6FFF]/15 border border-[#4C6FFF]/30 text-[#4C6FFF] font-semibold hover:bg-[#4C6FFF]/25 transition-colors flex items-center justify-center gap-2"
                    >
                      <ArrowDownLeft className="w-4 h-4" />
                      Deposit Funds
                    </button>
                    <button
                      onClick={() => { onClose(); navigate('/app/upgrade'); }}
                      className="w-full py-3.5 rounded-xl bg-[#00FFA3]/10 border border-[#00FFA3]/20 text-[#00FFA3] font-semibold hover:bg-[#00FFA3]/15 transition-colors flex items-center justify-center gap-2"
                    >
                      View Plans
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              <div className="mb-5">
                <h3 className="text-lg font-bold text-white mb-1">Execute Order</h3>
                <p className="text-xs text-white/40 uppercase tracking-widest">Vilox AI Secure Terminal</p>
              </div>

              {/* AI Signal Box */}
              <div className="bg-[#4C6FFF]/5 border border-[#4C6FFF]/20 rounded-xl p-4 mb-4 flex items-start gap-3">
                <Activity className="w-5 h-5 text-[#4C6FFF] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-white mb-1">AI Signal: {asset.signal}</h4>
                  <p className="text-xs text-white/60 leading-relaxed">
                    Vilox AI recommends{' '}
                    {asset.signal === 'SELL'
                      ? 'distributing'
                      : asset.signal === 'HOLD'
                        ? 'holding'
                        : 'accumulating'}{' '}
                    this asset. (Confidence: {confidenceDisplay})
                  </p>
                </div>
              </div>

              <div className="space-y-3 flex-1">
                {/* Buy / Sell toggle */}
                <div className="flex gap-2 bg-black/40 p-1 rounded-xl">
                  <button
                    onClick={() => setSide('BUY')}
                    className={cn(
                      'flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all',
                      side === 'BUY'
                        ? 'bg-[#00FFA3]/15 text-[#00FFA3] shadow-[0_0_12px_rgba(0,255,163,0.2)]'
                        : 'text-white/60 hover:text-white'
                    )}
                  >
                    <TrendingUp className="w-4 h-4 inline mr-1.5 -mt-0.5" /> Buy
                  </button>
                  <button
                    onClick={() => setSide('SELL')}
                    className={cn(
                      'flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all',
                      side === 'SELL'
                        ? 'bg-[#FF4D4D]/15 text-[#FF4D4D] shadow-[0_0_12px_rgba(255,77,77,0.2)]'
                        : 'text-white/60 hover:text-white'
                    )}
                  >
                    <TrendingDown className="w-4 h-4 inline mr-1.5 -mt-0.5" /> Sell
                  </button>
                </div>

                {/* Available balance */}
                <div className="bg-white/5 rounded-xl p-3 text-sm flex justify-between">
                  <span className="text-white/50">Available</span>
                  <span className="text-white font-mono font-medium">
                    {side === 'BUY'
                      ? availableUSD >= 0.01
                        ? `$${availableUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD`
                        : `~$${totalCryptoValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} (crypto)`
                      : `${availableAsset.toFixed(6)} ${tradingSymbol}`}
                  </span>
                </div>

                {/* Amount input */}
                <div>
                  <label className="text-xs text-white/50 uppercase tracking-widest mb-1.5 flex justify-between">
                    <span>Amount ({tradingSymbol})</span>
                    <button
                      onClick={() => quickFill(1)}
                      className="text-[#4C6FFF] font-bold hover:text-[#6C8FFF] transition-colors"
                    >
                      Max
                    </button>
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.000000"
                    min="0"
                    step="any"
                    className="w-full h-14 bg-white/5 border border-white/10 focus:border-[#4C6FFF] rounded-xl px-4 text-xl font-mono text-white focus:outline-none focus:ring-1 focus:ring-[#4C6FFF] transition-all"
                  />
                  {/* Quick fill buttons */}
                  <div className="flex gap-2 mt-2">
                    {[0.25, 0.5, 0.75, 1].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => quickFill(pct)}
                        className="flex-1 py-1.5 rounded-lg bg-white/5 text-white/50 hover:text-white hover:bg-white/10 text-xs font-medium transition-colors border border-white/10"
                      >
                        {(pct * 100).toFixed(0)}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fee & total breakdown */}
                <div className="bg-black/40 border border-white/5 rounded-xl p-3 space-y-2 text-sm">
                  <div className="flex justify-between text-white/50">
                    <span>Subtotal</span>
                    <span className="text-white font-mono">
                      ${(numericAmount * rawPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-white/50">
                    <span>Fee (0.1%)</span>
                    <span className="text-white font-mono">${toUSD(fee)}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t border-white/10 pt-2">
                    <span className="text-white">Total</span>
                    <span className={cn('font-mono', side === 'BUY' ? 'text-[#FF4D4D]' : 'text-[#00FFA3]')}>
                      {side === 'BUY' ? '-' : '+'}${toUSD(totalD.abs())}
                    </span>
                  </div>
                </div>

                {/* AI Price Targets */}
                <div className="bg-[#4C6FFF]/5 border border-[#4C6FFF]/20 rounded-xl p-4">
                  <h4 className="text-xs font-semibold text-[#4C6FFF] uppercase tracking-wider mb-3">
                    AI Price Targets
                  </h4>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="text-white/40 mb-1">Entry</p>
                      <p className="text-white font-mono">
                        {asset.entryPrice ?? `$${rawPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/40 mb-1">Take Profit</p>
                      <p className="text-[#00FFA3] font-mono">
                        {asset.takeProfit ?? `$${(rawPrice * 1.08).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/40 mb-1">Stop Loss</p>
                      <p className="text-[#FF4D4D] font-mono">
                        {asset.stopLoss ?? `$${(rawPrice * 0.95).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* High risk warning */}
                {effectiveRisk === 'High' && (
                  <div className="flex items-start gap-3 bg-[#FBBF24]/10 border border-[#FBBF24]/20 rounded-xl p-3 text-sm text-[#FBBF24]">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>High risk asset. Only invest what you can afford to lose.</span>
                  </div>
                )}
              </div>

              {/* Confirm button */}
              <div className="mt-4">
                {tradeError && (
                  <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
                    {tradeError}
                  </div>
                )}
                <div className="flex items-center gap-2 text-[10px] text-white/40 mb-3 justify-center">
                  <AlertCircle className="w-3 h-3" />
                  <span>Protected by Vilox Quantum Encryption</span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleConfirm}
                  disabled={numericAmount <= 0}
                  className={cn(
                    'w-full h-14 rounded-xl font-bold tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2',
                    side === 'BUY'
                      ? 'bg-[#00FFA3]/20 hover:bg-[#00FFA3]/30 text-[#00FFA3] border border-[#00FFA3]/30 shadow-[0_0_20px_rgba(0,255,163,0.15)]'
                      : 'bg-[#FF4D4D]/20 hover:bg-[#FF4D4D]/30 text-[#FF4D4D] border border-[#FF4D4D]/30 shadow-[0_0_20px_rgba(255,77,77,0.15)]'
                  )}
                >
                  {side === 'BUY' ? 'Execute Buy' : 'Execute Sell'} {tradingSymbol}
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
