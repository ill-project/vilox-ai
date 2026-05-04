// Vilox AI — db.ts
// All database access functions — uses Supabase client and Edge Functions

import { supabase } from './supabase';
import { supabaseAdminPanel } from './supabaseAdminPanel';

// â”€â”€ Shared Edge Function caller â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const callEdgeFunction = async (functionName: string, body: object) => {
  const { data: { session } } = await supabase.auth.getSession();

  // Fallback: the admin panel uses a separate Supabase client with
  // storageKey 'vilox-admin-session'. The default client above returns null
  // in that context, so check the admin panel client as a fallback.
  let accessToken = session?.access_token;
  if (!accessToken) {
    const { data: { session: adminSession } } = await supabaseAdminPanel.auth.getSession();
    accessToken = adminSession?.access_token;
  }

  let response: Response;
  try {
    response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(body),
      }
    );
  } catch {
    throw new Error(`Could not reach server. Run: npx supabase functions deploy ${functionName}`);
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Edge function error');
  return data;
};

// â”€â”€ Profile â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateUserProfile(userId: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// â”€â”€ Wallet â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getUserWallet(userId: string) {
  const { data, error } = await supabase
    .from('wallets')
    .select('usd, btc, eth, sol, usdt, locked_usd, user_id, id, updated_at')
    .eq('user_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
  return data ?? null;
}

export async function updateWalletBalance(userId: string, asset: string, newValue: number) {
  const col = asset.toLowerCase();
  // upsert handles both create-if-missing and update-if-exists atomically
  const { error } = await supabase
    .from('wallets')
    .upsert(
      { user_id: userId, [col]: newValue, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  if (error) throw error;
}

export async function transferBetweenAssets(userId: string, fromAsset: string, toAsset: string, amount: number) {
  const wallet = await getUserWallet(userId);
  if (!wallet) throw new Error('Wallet not found');
  const fromBal = Number((wallet as Record<string, unknown>)[fromAsset] ?? 0);
  if (fromBal < amount) throw new Error('Insufficient balance');
  const toBal = Number((wallet as Record<string, unknown>)[toAsset] ?? 0);
  const { error } = await supabase
    .from('wallets')
    .update({
      [fromAsset]: fromBal - amount,
      [toAsset]: toBal + amount,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;
}

// â”€â”€ Transactions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getUserTransactions(userId: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addTransaction(userId: string, tx: {
  type: 'deposit' | 'withdraw' | 'transfer';
  asset: string;
  amount: number;
  fee?: number;
  status?: 'pending' | 'completed' | 'failed';
  notes?: string;
}) {
  const { data, error } = await supabase
    .from('transactions')
    .insert({ user_id: userId, fee: 0, status: 'completed', ...tx })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// â”€â”€ Trades â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getUserTrades(userId: string) {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addTrade(userId: string, trade: {
  symbol: string;
  asset_type: 'CRYPTO' | 'STOCK' | 'ETF';
  side: 'BUY' | 'SELL';
  amount: number;
  price: number;
  fee?: number;
  entry_price?: number;
  take_profit?: number;
  stop_loss?: number;
  strategy_id?: string;
}) {
  const { data, error } = await supabase
    .from('trades')
    .insert({ user_id: userId, fee: 0, status: 'filled', ...trade })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// â”€â”€ AI Strategies â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getActiveStrategies(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('ai_strategies')
    .select('strategy_key')
    .eq('user_id', userId)
    .eq('is_active', true);
  if (error) throw error;
  return (data ?? []).map((r: { strategy_key: string }) => r.strategy_key);
}

export async function activateStrategy(userId: string, strategyKey: string, name: string) {
  const { error } = await supabase
    .from('ai_strategies')
    .upsert(
      { user_id: userId, strategy_key: strategyKey, name, is_active: true },
      { onConflict: 'user_id,strategy_key' }
    );
  if (error) throw error;
}

export async function deactivateStrategy(userId: string, strategyKey: string) {
  const { error } = await supabase
    .from('ai_strategies')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('strategy_key', strategyKey);
  if (error) throw error;
}

// â”€â”€ KYC â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getKycStatus(userId: string) {
  const { data, error } = await supabase
    .from('kyc')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

export async function submitKyc(userId: string, kyc: {
  doc_type: 'passport' | 'drivers_license' | 'national_id';
  doc_url?: string;
  selfie_url?: string;
}) {
  // Use edge function (service role) so it bypasses RLS on UPDATE
  await callEdgeFunction('kyc-upload', { action: 'submit', ...kyc });
}

// â”€â”€ Referrals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getUserReferral(userId: string) {
  const { data, error } = await supabase
    .from('referrals')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

// Auto-creates a referral row with a unique code if none exists
export async function upsertReferral(userId: string) {
  const existing = await getUserReferral(userId);
  if (existing) return existing;
  const code = 'VLX' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const { data, error } = await supabase
    .from('referrals')
    .insert({ user_id: userId, referral_code: code, total_referred: 0, rewards_usd: 0 })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Apply $25 bonus to both referrer and new user when a valid referral code is used
export async function applyReferralBonus(newUserId: string, refCode: string): Promise<boolean> {
  try {
    // Find the referrer by code
    const { data: referral, error: refErr } = await supabase
      .from('referrals')
      .select('user_id, total_referred, rewards_usd')
      .eq('referral_code', refCode.toUpperCase().trim())
      .maybeSingle();
    if (refErr || !referral) return false;
    const referrerId = referral.user_id;
    if (referrerId === newUserId) return false; // can't refer yourself

    const BONUS = 25;

    // Credit referrer wallet +$25 USD
    await supabase.rpc('increment_wallet_balance', { p_user_id: referrerId, p_asset: 'usd', p_amount: BONUS });

    // Credit new user wallet +$25 USD
    await supabase.rpc('increment_wallet_balance', { p_user_id: newUserId, p_asset: 'usd', p_amount: BONUS });

    // Update referrer stats
    await supabase
      .from('referrals')
      .update({
        total_referred: (referral.total_referred ?? 0) + 1,
        rewards_usd: (Number(referral.rewards_usd) ?? 0) + BONUS,
      })
      .eq('user_id', referrerId);

    // Log transactions for both
    await addTransaction(referrerId, { type: 'bonus', asset: 'USD', amount: BONUS, status: 'completed', notes: `Referral bonus — friend joined with your code` });
    await addTransaction(newUserId, { type: 'bonus', asset: 'USD', amount: BONUS, status: 'completed', notes: `Welcome bonus — signed up with referral code ${refCode}` });

    return true;
  } catch {
    return false;
  }
}

// â”€â”€ Subscriptions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const getUserSubscription = async (userId: string) => {
  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  return data;
};

// Working plan purchase — uses buy-subscription Edge Function (service role bypasses RLS)
export const createSubscription = async (_userId: string, plan: string, price: number) => {
  const result = await callEdgeFunction('buy-subscription', { plan, price });
  return { ...result, creditApplied: 0 };
};

// â”€â”€ Deposit Addresses â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const getDepositAddress = async (symbol: string) => {
  const { data, error } = await supabase
    .from('deposit_addresses')
    .select('*')
    .eq('symbol', symbol.toUpperCase())
    .eq('is_active', true)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
};

export const getAllDepositAddresses = async () => {
  const { data, error } = await supabase
    .from('deposit_addresses')
    .select('*')
    .not('address', 'is', null);
  if (error) throw error;
  return (data ?? []) as {
    symbol: string;
    address: string;
    network: string | null;
    min_deposit: string | null;
    is_active: boolean | null;
  }[];
};

// â”€â”€ Portfolio Snapshots â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getPortfolioSnapshots(userId: string, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('portfolio_snapshots')
    .select('total_value_usd, created_at')
    .eq('user_id', userId)
    .gte('created_at', since)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as { total_value_usd: number; created_at: string }[];
}

export async function insertPortfolioSnapshot(userId: string, totalValueUsd: number) {
  const { error } = await supabase
    .from('portfolio_snapshots')
    .insert({ user_id: userId, total_value_usd: totalValueUsd });
  if (error) throw error;
}

// â”€â”€ Admin â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Fetches all users via the admin-users Edge Function (emails from auth.users server-side)
export const adminGetAllUsers = async () => {
  const data = await callEdgeFunction('admin-users', {});
  return (data.users ?? []) as Record<string, unknown>[];
};

export const adminGetAllTrades = async () => {
  const { data, error } = await supabaseAdminPanel
    .from('trades')
    .select('*, profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as Record<string, unknown>[];
};

export const adminGetAllTransactions = async () => {
  const { data, error } = await supabaseAdminPanel
    .from('transactions')
    .select('*, profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as Record<string, unknown>[];
};

export const adminGetPendingTransactions = async () => {
  const data = await callEdgeFunction('admin-approve-transaction', { action: 'list' });
  return (data.transactions ?? []) as Record<string, unknown>[];
};

export const adminApproveTransaction = async (txId: string, decision: 'approve' | 'reject') =>
  callEdgeFunction('admin-approve-transaction', { action: 'decision', txId, decision });

export const adminGetPendingKyc = async () => {
  const data = await callEdgeFunction('admin-manage-user', { action: 'list_pending_kyc' });
  return (data.kyc ?? []) as Record<string, unknown>[];
};

export const adminGetAllChats = async () => {
  const { data, error } = await supabaseAdminPanel
    .from('support_chats')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Record<string, unknown>[];
};

export const adminGetUserChats = async (userId: string) => {
  const { data, error } = await supabaseAdminPanel
    .from('support_chats')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Record<string, unknown>[];
};

export const adminSendChatMessage = async (userId: string, message: string) => {
  const { error } = await supabaseAdminPanel
    .from('support_chats')
    .insert({ user_id: userId, message, sender: 'admin', session_id: `wallet:${userId}`, is_read: true });
  if (error) throw error;
};

export const adminMarkChatsRead = async (userId: string) => {
  await supabaseAdminPanel
    .from('support_chats')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('sender', 'user');
};

export const adminAdjustBalance = async (
  userId: string, asset: string, amount: number, reason = 'Admin adjustment'
) => callEdgeFunction('admin-adjust-balance', { userId, asset, amount, reason });

export const adminUpdatePlan = async (userId: string, plan: string) =>
  callEdgeFunction('admin-manage-user', { action: 'update_plan', userId, plan });

export const adminUpdateKyc = async (userId: string, status: string, reason?: string) =>
  callEdgeFunction('admin-manage-user', { action: 'update_kyc', userId, kycStatus: status, reason: reason ?? '' });

export const adminSuspendUser = async (userId: string, suspend: boolean) => {
  const { error } = await supabaseAdminPanel
    .from('profiles')
    .update({ is_suspended: suspend, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
};

export const adminGetOverview = async () => {
  const [usersRes, tradesRes, txRes] = await Promise.all([
    supabaseAdminPanel.from('profiles').select('id, full_name, created_at, plan', { count: 'exact' }).order('created_at', { ascending: false }).limit(5),
    supabaseAdminPanel.from('trades').select('id', { count: 'exact' }).gte('created_at', new Date(Date.now() - 86400000).toISOString()),
    supabaseAdminPanel.from('transactions').select('amount', { count: 'exact' }).eq('type', 'deposit').eq('status', 'completed').gte('created_at', new Date(Date.now() - 86400000).toISOString()),
  ]);
  const totalDepositsToday = (txRes.data ?? []).reduce((s: number, r: Record<string, unknown>) => s + Number(r.amount ?? 0), 0);
  return {
    totalUsers: usersRes.count ?? 0,
    tradesToday: tradesRes.count ?? 0,
    depositsToday: totalDepositsToday,
    recentSignups: (usersRes.data ?? []) as Record<string, unknown>[],
  };
};

// â”€â”€ Admin: Deposit Addresses â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const adminGetAllDepositAddresses = async () => {
  const data = await callEdgeFunction('admin-deposit-addresses', { action: 'get' });
  return (data.addresses ?? []) as Record<string, unknown>[];
};

export const adminUpsertDepositAddress = async (row: {
  symbol: string; address: string; network?: string; min_deposit?: string; is_active?: boolean;
}) => callEdgeFunction('admin-deposit-addresses', {
  action: 'upsert',
  symbol: row.symbol.toUpperCase(),
  address: row.address,
  network: row.network ?? '',
  min_deposit: row.min_deposit ?? '',
});

export const adminToggleDepositAddress = async (symbol: string, is_active: boolean) =>
  callEdgeFunction('admin-deposit-addresses', { action: 'toggle', symbol: symbol.toUpperCase(), is_active });

export const adminDeleteDepositAddress = async (symbol: string) =>
  callEdgeFunction('admin-deposit-addresses', { action: 'delete', symbol: symbol.toUpperCase() });

// â”€â”€ Admin: User full details â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const adminGetUserFull = async (userId: string) => {
  try {
    let profile, wallet;
    
    try {
      const profileRes = await supabaseAdminPanel.from('profiles').select('*').eq('id', userId).single();
      if (profileRes.error) {
        throw new Error(`Failed to load user profile: ${profileRes.error.message}`);
      }
      profile = profileRes.data;
    } catch (error) {
      throw error;
    }
    
    try {
      const walletRes = await supabaseAdminPanel.from('wallets').select('*').eq('user_id', userId).single();
      if (walletRes.error && walletRes.error.code !== 'PGRST116') {
        wallet = { usd: 0, btc: 0, eth: 0, sol: 0, usdt: 0, locked_usd: 0 };
      } else {
        wallet = walletRes.data;
      }
    } catch {
      wallet = { usd: 0, btc: 0, eth: 0, sol: 0, usdt: 0, locked_usd: 0 };
    }
    const [kyc, trades, transactions, strategies] = await Promise.allSettled([
      supabaseAdminPanel.from('kyc_verifications').select('*').eq('user_id', userId).maybeSingle(),
      supabaseAdminPanel.from('trades').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
      supabaseAdminPanel.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
      Promise.resolve(supabaseAdminPanel.from('ai_strategies').select('*').eq('user_id', userId).eq('is_active', true)).catch(() => ({ data: [] }))
    ]);
    
    const result = {
      profile,
      wallet,
      kyc: kyc.status === 'fulfilled' ? kyc.value.data : null,
      trades: trades.status === 'fulfilled' ? (trades.value.data ?? []) : [],
      transactions: transactions.status === 'fulfilled' ? (transactions.value.data ?? []) : [],
      strategies: strategies.status === 'fulfilled' ? (strategies.value.data ?? []) : [],
    };
    
    return result;
    
  } catch (error) {
    throw error;
  }
};

// Fallback function that only loads essential user data
export const adminGetUserMinimal = async (userId: string) => {
  try {
    const { data: profile, error } = await supabaseAdminPanel
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      throw new Error(`Failed to load user profile: ${error.message}`);
    }
    
    return {
      profile,
      wallet: null,
      kyc: null,
      trades: [],
      transactions: [],
      strategies: [],
    };
    
  } catch (error) {
    throw error;
  }
};

// â”€â”€ Admin: Update transaction status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const adminUpdateTransactionStatus = async (txId: string, status: 'pending' | 'completed' | 'failed') => {
  const { error } = await supabaseAdminPanel
    .from('transactions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', txId);
  if (error) throw error;
};

// â”€â”€ Admin: Delete user â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const adminDeleteUser = async (userId: string) =>
  callEdgeFunction('admin-manage-user', { action: 'delete', userId });

// â”€â”€ Admin: Email â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const adminSendEmail = async (toEmail: string, subject: string, body: string) =>
  callEdgeFunction('admin-email', { to: toEmail, subject, body, broadcast: false });

export const adminBroadcastEmail = async (subject: string, body: string, plan?: string) =>
  callEdgeFunction('admin-email', { subject, body, broadcast: true, plan });

// â”€â”€ Admin: App settings (site_settings table) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const adminGetSettings = async () => {
  const { data, error } = await supabaseAdminPanel
    .from('site_settings')
    .select('*');
  if (error && error.code !== '42P01') throw error;
  return (data ?? []) as { key: string; value: string }[];
};

export const adminSetSetting = async (key: string, value: string) => {
  const { error } = await supabaseAdminPanel
    .from('site_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw error;
};

// â”€â”€ Admin: Block / Unblock / Notes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const adminBlockUser = async (userId: string, reason: string) =>
  callEdgeFunction('admin-manage-user', { action: 'block', userId, reason });

export const adminUnblockUser = async (userId: string) =>
  callEdgeFunction('admin-manage-user', { action: 'unblock', userId });

export const adminAddNote = async (userId: string, note: string) =>
  callEdgeFunction('admin-manage-user', { action: 'note', userId, note });

// â”€â”€ Admin: Activity logs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const adminGetLogs = async () => {
  const { data, error } = await supabaseAdminPanel
    .from('admin_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error && (error.code === '42P01' || error.code === 'PGRST200')) return [];
  if (error) throw error;
  return (data ?? []) as Record<string, unknown>[];
};

export const adminInsertLog = async (action: string, targetUserId?: string, details?: string) => {
  const { data: { session } } = await supabaseAdminPanel.auth.getSession();
  if (!session) return;
  await supabaseAdminPanel.from('admin_logs').insert({
    admin_id: session.user.id,
    action,
    target_user_id: targetUserId ?? null,
    details: details ?? null,
  }).then(() => {});
};

// â”€â”€ Admin: Cancel trade â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const adminCancelTrade = async (tradeId: string) => {
  const { error } = await supabaseAdminPanel
    .from('trades')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', tradeId);
  if (error) throw error;
};

// â”€â”€ Admin: Enhanced overview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const adminGetFullOverview = async () => {
  const todayIso = new Date(Date.now() - 86400000).toISOString();

  // Run all queries independently so one failure doesn't break the whole overview
  const [usersResult, tradesTodayResult, pendingKycResult, unreadChatsResult] = await Promise.all([
    adminGetAllUsers().catch(() => [] as Record<string, unknown>[]),
    Promise.resolve(supabaseAdminPanel.from('trades').select('id', { count: 'exact', head: true }).gte('created_at', todayIso)).then(r => r.count ?? 0).catch(() => 0),
    Promise.resolve(supabaseAdminPanel.from('kyc').select('id', { count: 'exact', head: true }).eq('status', 'pending')).then(r => r.count ?? 0).catch(() => 0),
    Promise.resolve(supabaseAdminPanel.from('support_chats').select('id', { count: 'exact', head: true }).eq('sender', 'user').eq('is_read', false)).then(r => r.count ?? 0).catch(() => 0),
  ]);

  const allUsers = usersResult as Record<string, unknown>[];

  // Sum total USD wallet balance across all users
  const totalDeposits = allUsers.reduce((sum, u) => {
    const w = u.wallets as Record<string, number> | null;
    return sum + Number(w?.usd ?? 0);
  }, 0);

  // Active today — users who logged in within last 24h
  const activeUsersToday = allUsers.filter(u => {
    const lastLogin = u.last_login_at as string | null;
    return lastLogin && new Date(lastLogin).getTime() > Date.now() - 86400000;
  }).length;

  // Recent 10 signups, sorted newest first, with email
  const recentSignups = [...allUsers]
    .sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime())
    .slice(0, 10);

  return {
    totalUsers: allUsers.length,
    activeUsersToday,
    totalDeposits,
    tradesToday: tradesTodayResult as number,
    pendingKyc: pendingKycResult as number,
    unreadChats: unreadChatsResult as number,
    recentSignups,
  };
};
