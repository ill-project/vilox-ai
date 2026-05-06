/**
 * supabaseService.ts
 * ------------------
 * Centralised Supabase data access layer.
 * All components import from here — never from lib/db.ts directly.
 * Swap the underlying client here to migrate between providers.
 */

import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface WalletRow {
  id: string;
  user_id: string;
  usd: number;
  btc: number;
  eth: number;
  sol: number;
  usdt: number;
  locked_usd: number;
  updated_at: string;
}

export interface TradeRow {
  id: string;
  user_id: string;
  symbol: string;
  asset_type: 'CRYPTO' | 'STOCK' | 'ETF';
  side: 'BUY' | 'SELL';
  amount: number;
  price: number;
  total: number;
  fee: number;
  status: 'pending' | 'filled' | 'cancelled' | 'failed';
  created_at: string;
}

export interface TransactionRow {
  id: string;
  user_id: string;
  type: 'deposit' | 'withdraw' | 'transfer';
  asset: string;
  amount: number;
  fee: number;
  status: 'pending' | 'completed' | 'failed';
  tx_hash: string | null;
  created_at: string;
}

export interface SignalRow {
  id: string;
  symbol: string;
  asset_type: 'CRYPTO' | 'STOCK' | 'ETF';
  action: 'BUY' | 'SELL' | 'HOLD' | 'STRONG BUY' | 'STRONG SELL';
  confidence: number;
  risk: 'Low' | 'Medium' | 'High';
  price: number;
  reason: string | null;
  expires_at: string | null;
  created_at: string;
  /** Real logo URL from CoinGecko — undefined for stocks/mock rows */
  image_url?: string;
}

export interface ExecuteTradeResult {
  success: boolean;
  trade_id?: string;
  fee?: number;
  cost?: number;
  total?: number;
  error?: string;
}

export interface WithdrawResult {
  success: boolean;
  tx_id?: string;
  fee?: number;
  amount?: number;
  error?: string;
}

// â”€â”€ Wallet â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchWallet(userId: string): Promise<WalletRow | null> {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

export async function createWallet(userId: string): Promise<WalletRow> {
  const { data, error } = await supabase
    .from('wallets')
    .insert({ user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Trade execution via direct wallet update ──────────────────────────────────
// Reads the live wallet, validates balances, applies debit/credit, then records
// the trade — all using the authenticated user's Supabase session.

// Wallet columns that map 1-to-1 with crypto symbols
const CRYPTO_WALLET_COLS = ['btc', 'eth', 'sol', 'usdt'];

export async function rpcExecuteTrade(params: {
  p_symbol: string;
  p_asset_type: 'CRYPTO' | 'STOCK' | 'ETF';
  p_side: 'BUY' | 'SELL';
  p_amount: number;
  p_price: number;
  p_fee_rate?: number;
  p_strategy_id?: string | null;
}): Promise<ExecuteTradeResult> {
  const { p_symbol, p_asset_type, p_side, p_amount, p_price } = params;
  const feeRate = params.p_fee_rate ?? 0.001;
  const symbol  = p_symbol.toLowerCase();
  const gross   = p_amount * p_price;
  const fee     = gross * feeRate;

  // Authenticate
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { success: false, error: 'Not authenticated' };

  // Fetch current wallet
  const { data: wallet, error: walletError } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', user.id)
    .single();
  if (walletError || !wallet) return { success: false, error: 'Wallet not found' };

  const w           = wallet as Record<string, unknown>;
  const currentUSD  = Number(w.usd)      || 0;
  const walletPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (p_side === 'BUY') {
    const cost = gross + fee;
    if (currentUSD < cost) {
      return {
        success: false,
        error: `Insufficient USD balance. Need $${cost.toFixed(2)} but have $${currentUSD.toFixed(2)}`,
      };
    }
    walletPatch.usd = currentUSD - cost;
    if (CRYPTO_WALLET_COLS.includes(symbol)) {
      walletPatch[symbol] = (Number(w[symbol]) || 0) + p_amount;
    }
    // Stocks / ETFs: only USD is debited; no wallet column to credit
  } else {
    // SELL
    const proceeds     = gross - fee;
    const currentAsset = Number(w[symbol]) || 0;
    if (currentAsset < p_amount) {
      return {
        success: false,
        error: `Insufficient ${p_symbol} balance. You have ${currentAsset.toFixed(8)}, tried to sell ${p_amount.toFixed(8)}`,
      };
    }
    if (CRYPTO_WALLET_COLS.includes(symbol)) {
      walletPatch[symbol] = currentAsset - p_amount;
    }
    walletPatch.usd = currentUSD + proceeds;
  }

  // Commit wallet update
  const { error: updateError } = await supabase
    .from('wallets')
    .update(walletPatch)
    .eq('user_id', user.id);
  if (updateError) return { success: false, error: `Wallet update failed: ${updateError.message}` };

  // Record the trade
  const { data: trade } = await supabase
    .from('trades')
    .insert({
      user_id:    user.id,
      symbol:     p_symbol.toUpperCase(),
      asset_type: p_asset_type,
      side:       p_side,
      amount:     p_amount,
      price:      p_price,
      total:      gross,
      fee,
      status:     'filled',
    })
    .select('id')
    .single();

  return { success: true, trade_id: trade?.id, fee, total: gross };
}

// â”€â”€ Atomic withdrawal via server-side RPC â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function rpcProcessWithdrawal(params: {
  p_asset: string;
  p_amount: number;
}): Promise<WithdrawResult> {
  const { data, error } = await supabase.rpc('process_withdrawal', params);
  if (error) return { success: false, error: error.message };
  return data as WithdrawResult;
}

// â”€â”€ Trades history â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchTrades(userId: string): Promise<TradeRow[]> {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

// â”€â”€ Transactions history â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchTransactions(userId: string): Promise<TransactionRow[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

// â”€â”€ AI Signals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchSignals(): Promise<SignalRow[]> {
  const { data, error } = await supabase
    .from('ai_signals')
    .select('*')
    .order('confidence', { ascending: false })
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

// â”€â”€ Realtime subscriptions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//
// Architecture rules enforced here:
//   1. .on() listeners are always added BEFORE .subscribe() — once subscribe()
//      fires, the channel is locked and adding listeners causes a crash.
//   2. Channel names are unique per wallet row id to avoid "Channel Occupied"
//      conflicts when a user has multiple tabs open.
//   3. All subscription functions return the configured channel. Callers are
//      responsible for cleanup via unsubscribe().
//   4. Connection lifecycle is handled inside subscribe() callback so the UI
//      can surface RECONNECTING / ERROR states.

// Possible connection statuses surfaced to the UI layer.
export type ChannelStatus = 'CONNECTED' | 'RECONNECTING' | 'CLOSED' | 'ERROR';

/**
 * Subscribe to live wallet row updates for a specific user.
 *
 * @param userId   - auth.uid() — used for the server-side RLS filter.
 * @param walletId - wallet row id — used for unique channel naming.
 * @param onUpdate - called with the full updated WalletRow payload.
 * @param onStatusChange - optional: called when connection state changes.
 */
export function subscribeToWallet(
  userId: string,
  walletId: string,
  onUpdate: (wallet: WalletRow) => void,
  onStatusChange?: (status: ChannelStatus) => void
): RealtimeChannel {
  // .on() BEFORE .subscribe() — channel is locked after subscribe() fires.
  const channel = supabase
    .channel(`realtime:wallet:${walletId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'wallets',
        // Strict server-side filter: only rows belonging to this user arrive.
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const updated = payload.new as WalletRow;
        // Client-side guard: reject payloads not matching the subscribed wallet.
        if (updated.id !== walletId) return;
        onUpdate(updated);
      }
    );

  // subscribe() callback handles connection lifecycle events.
  channel.subscribe((status) => {
    switch (status) {
      case 'SUBSCRIBED':
        onStatusChange?.('CONNECTED');
        break;
      case 'TIMED_OUT':
      case 'CLOSED':
        onStatusChange?.('RECONNECTING');
        break;
      case 'CHANNEL_ERROR':
        onStatusChange?.('ERROR');
        break;
    }
  });

  return channel;
}

/**
 * Subscribe to new trade inserts for a specific user.
 */
export function subscribeToTrades(
  userId: string,
  onInsert: (trade: TradeRow) => void,
  onStatusChange?: (status: ChannelStatus) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`realtime:trades:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'trades',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const inserted = payload.new as TradeRow;
        if (inserted.user_id !== userId) return;
        onInsert(inserted);
      }
    );

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') onStatusChange?.('CONNECTED');
    else if (status === 'TIMED_OUT' || status === 'CLOSED') onStatusChange?.('RECONNECTING');
    else if (status === 'CHANNEL_ERROR') onStatusChange?.('ERROR');
  });

  return channel;
}

/**
 * Subscribe to platform-wide AI signal changes (no user filter — public table).
 */
export function subscribeToSignals(
  onUpsert: (signal: SignalRow) => void
): RealtimeChannel {
  const channel = supabase
    .channel('realtime:ai_signals')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'ai_signals' },
      (payload) => {
        if (payload.new) onUpsert(payload.new as SignalRow);
      }
    );

  channel.subscribe();

  return channel;
}

/**
 * Cleanly remove a channel from the Supabase client, closing the WebSocket
 * connection. Must be called when a component unmounts or a user logs out.
 */
export function unsubscribe(channel: RealtimeChannel): void {
  supabase.removeChannel(channel);
}

// â”€â”€ Profile â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

export async function updateProfile(userId: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// â”€â”€ AI Strategies â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchActiveStrategyKeys(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('ai_strategies')
    .select('strategy_key')
    .eq('user_id', userId)
    .eq('is_active', true);
  if (error) throw error;
  return (data ?? []).map((r: { strategy_key: string }) => r.strategy_key);
}

export async function upsertStrategy(userId: string, strategyKey: string, name: string, isActive: boolean) {
  const { error } = await supabase
    .from('ai_strategies')
    .upsert(
      { user_id: userId, strategy_key: strategyKey, name, is_active: isActive },
      { onConflict: 'user_id,strategy_key' }
    );
  if (error) throw error;
}

// â”€â”€ KYC (signed URL upload) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Uses Storage signed URLs so the doc path is never exposed in API responses.

export async function createKycUploadUrl(
  userId: string,
  fileName: string
): Promise<string> {
  const path = `kyc/${userId}/${Date.now()}_${fileName}`;
  const { data, error } = await supabase.storage
    .from('kyc-documents')
    .createSignedUploadUrl(path);
  if (error) throw error;
  return data.signedUrl;
}

export async function submitKycRecord(
  userId: string,
  docType: 'passport' | 'drivers_license' | 'national_id',
  docStoragePath: string,
  selfieStoragePath: string
) {
  const { error } = await supabase
    .from('kyc')
    .upsert(
      {
        user_id: userId,
        doc_type: docType,
        doc_url: docStoragePath,
        selfie_url: selfieStoragePath,
        status: 'pending',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
  if (error) throw error;
}

// â”€â”€ Market cache fallback â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function fetchMarketCache(): Promise<Record<string, { price: number; change_24h: number }>> {
  const { data, error } = await supabase
    .from('market_cache')
    .select('symbol, price, change_24h');
  if (error) return {};
  return Object.fromEntries(
    (data ?? []).map((r: { symbol: string; price: number; change_24h: number }) => [
      r.symbol,
      { price: r.price, change_24h: r.change_24h },
    ])
  );
}
