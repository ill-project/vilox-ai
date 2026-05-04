/**
 * tradingService.ts
 * -----------------
 * Wraps the execute_trade RPC with Decimal.js precision.
 * All financial math happens here — never with raw JS floats.
 */

import Decimal from 'decimal.js';
import { rpcExecuteTrade, rpcProcessWithdrawal } from './supabaseService';
import type { ExecuteTradeResult, WithdrawResult } from './supabaseService';

// Configure Decimal.js for financial precision
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_EVEN });

export const FEE_RATE = new Decimal(import.meta.env.VITE_APP_FEE_RATE ?? '0.001');

// â”€â”€ Fee & total calculations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function calcFee(amount: number | string, price: number | string): Decimal {
  return new Decimal(amount).times(price).times(FEE_RATE);
}

export function calcBuyCost(amount: number | string, price: number | string): Decimal {
  const gross = new Decimal(amount).times(price);
  return gross.plus(gross.times(FEE_RATE));
}

export function calcSellProceeds(amount: number | string, price: number | string): Decimal {
  const gross = new Decimal(amount).times(price);
  return gross.minus(gross.times(FEE_RATE));
}

/** Returns a display-ready string rounded to 2 decimal places. */
export function toUSD(value: Decimal | number | string): string {
  return new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN).toFixed(2);
}

export function toAsset(value: Decimal | number | string, decimals = 6): string {
  return new Decimal(value).toDecimalPlaces(decimals, Decimal.ROUND_DOWN).toFixed(decimals);
}

// â”€â”€ Trade execution â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface TradeParams {
  symbol: string;
  assetType: 'CRYPTO' | 'STOCK' | 'ETF';
  side: 'BUY' | 'SELL';
  /** Number of units (coins/shares) */
  amount: number | string;
  /** Price per unit in USD */
  price: number | string;
  strategyId?: string | null;
}

export async function executeTrade(params: TradeParams): Promise<ExecuteTradeResult> {
  const amt = new Decimal(params.amount);
  const prc = new Decimal(params.price);

  if (amt.lte(0) || prc.lte(0)) {
    return { success: false, error: 'Amount and price must be positive' };
  }

  return rpcExecuteTrade({
    p_symbol:      params.symbol,
    p_asset_type:  params.assetType,
    p_side:        params.side,
    // Convert to JS number for JSON serialisation — precision already validated above
    p_amount:      amt.toNumber(),
    p_price:       prc.toNumber(),
    p_fee_rate:    FEE_RATE.toNumber(),
    p_strategy_id: params.strategyId ?? null,
  });
}

// â”€â”€ Withdrawal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function processWithdrawal(
  asset: string,
  amount: number | string
): Promise<WithdrawResult> {
  const amt = new Decimal(amount);
  if (amt.lte(0)) {
    return { success: false, error: 'Amount must be positive' };
  }
  return rpcProcessWithdrawal({ p_asset: asset.toLowerCase(), p_amount: amt.toNumber() });
}
