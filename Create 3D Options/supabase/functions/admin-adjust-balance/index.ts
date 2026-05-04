/**
 * Edge Function: admin-adjust-balance
 *
 * Adjusts a user's wallet balance. Uses the service role key so it
 * bypasses RLS — safe because we verify the caller is an admin first.
 *
 * Deploy with:
 *   supabase functions deploy admin-adjust-balance
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── 1. Auth ────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data: { user }, error: authError } = await adminClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 2. Verify admin ────────────────────────────────────────────────────────
    const { data: profile } = await adminClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 3. Parse & validate body ───────────────────────────────────────────────
    const { userId, asset, amount } = await req.json() as {
      userId: string;
      asset: string;
      amount: number;
    };

    if (!userId || !asset || amount === 0) {
      return new Response(JSON.stringify({ error: 'userId, asset, and non-zero amount are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const assetColumn = asset.toLowerCase();
    const validAssets = ['usd','btc','eth','sol','usdt','xrp','bnb','ada','avax','doge','dot','matic','link','shib','trx','qnt','usdc','uni','atom','ltc','near','op','arb'];
    if (!validAssets.includes(assetColumn)) {
      return new Response(JSON.stringify({ error: `Invalid asset: ${asset}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 4. Fetch wallet (service role bypasses RLS) ────────────────────────────
    const { data: wallet, error: fetchError } = await adminClient
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError || !wallet) {
      return new Response(JSON.stringify({ error: 'Wallet not found for this user' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const currentBalance = Number(wallet[assetColumn] ?? 0);
    const newBalance = currentBalance + amount;

    if (newBalance < 0) {
      return new Response(JSON.stringify({
        error: `Insufficient balance. Current ${asset.toUpperCase()}: ${currentBalance}, attempted: ${amount}`
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── 5. Update wallet ───────────────────────────────────────────────────────
    const { error: updateError } = await adminClient
      .from('wallets')
      .update({ [assetColumn]: newBalance, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (updateError) {
      return new Response(JSON.stringify({ error: `Wallet update failed: ${updateError.message}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 6. Remove any auto-triggered transaction row for this adjustment ────────
    // A DB trigger on `wallets` may auto-insert a row into `transactions`.
    // Admin balance adjustments must never appear in user transaction history —
    // they should only reflect as a wallet balance change.
    await adminClient
      .from('transactions')
      .delete()
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 5000).toISOString())
      .not('notes', 'ilike', 'Plan subscription%')
      .then(() => {}).catch(() => {});

    // ── 7. Log to admin_logs ───────────────────────────────────────────────────
    await adminClient.from('admin_logs').insert({
      admin_id: user.id,
      action: 'BALANCE_ADJUSTMENT',
      target_user_id: userId,
      details: `Adjusted ${asset.toUpperCase()} from ${currentBalance} to ${newBalance} (${amount > 0 ? '+' : ''}${amount})`,
      created_at: new Date().toISOString(),
    }).then(() => {}).catch(() => {});

    return new Response(JSON.stringify({ success: true, previousBalance: currentBalance, newBalance }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
