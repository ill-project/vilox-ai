/**
 * Edge Function: buy-subscription
 *
 * Handles plan purchases using service role to bypass RLS:
 *   1. Verifies authenticated user
 *   2. Validates plan and price
 *   3. Checks wallet balance
 *   4. Deducts wallet + upserts subscription + updates profile in one go
 *   5. Logs transaction
 *
 * Body: { plan: 'starter'|'pro'|'elite', price: number }
 *
 * Deploy:
 *   supabase functions deploy buy-subscription
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_PLANS = ['starter', 'pro', 'elite'];
const PLAN_RANK: Record<string, number> = { starter: 0, pro: 1, elite: 2 };

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Verify caller
    const { data: { user }, error: userError } = await serviceClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { plan, price } = await req.json();

    // Validate inputs
    if (!plan || !VALID_PLANS.includes(plan)) {
      return new Response(JSON.stringify({ error: 'Invalid plan type' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (typeof price !== 'number' || price < 0) {
      return new Response(JSON.stringify({ error: 'Invalid price' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch wallet
    const { data: wallet, error: walletErr } = await serviceClient
      .from('wallets')
      .select('usd')
      .eq('user_id', user.id)
      .single();

    if (walletErr || !wallet) {
      return new Response(JSON.stringify({ error: 'Unable to access wallet' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const currentBalance = Number(wallet.usd ?? 0);
    if (currentBalance < price) {
      return new Response(JSON.stringify({
        error: `Insufficient balance. Required: $${price.toFixed(2)}, Available: $${currentBalance.toFixed(2)}`,
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const newBalance = currentBalance - price;
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Deduct wallet — use .select() to confirm a row was actually updated
    const { data: updatedWallet, error: walletUpdateErr } = await serviceClient
      .from('wallets')
      .update({ usd: newBalance, updated_at: now })
      .eq('user_id', user.id)
      .select('usd')
      .single();

    if (walletUpdateErr || !updatedWallet) {
      return new Response(JSON.stringify({ error: 'Failed to process payment — wallet update failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Update profile plan (critical — this is what the app reads)
    const { error: profileErr } = await serviceClient
      .from('profiles')
      .update({ plan })
      .eq('id', user.id);

    if (profileErr) {
      // Rollback wallet
      await serviceClient.from('wallets').update({ usd: currentBalance, updated_at: now }).eq('user_id', user.id);
      return new Response(JSON.stringify({ error: `Failed to activate plan: ${profileErr.message}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Upsert subscription record (non-critical — table may not exist yet)
    await serviceClient
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        plan,
        price,
        status: 'active',
        started_at: now,
        expires_at: expiresAt,
        updated_at: now,
      }, { onConflict: 'user_id' })
      .then(() => {})
      .catch(() => {});

    // 4. Log transaction (non-critical)
    await serviceClient.from('transactions').insert({
      user_id: user.id,
      type: 'withdraw',
      asset: 'USD',
      amount: price,
      status: 'completed',
      network: 'internal',
      notes: `Plan subscription: ${plan}`,
    }).then(() => {}).catch(() => {});

    const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
    return new Response(JSON.stringify({
      success: true,
      message: `Welcome to ${planLabel} AI! Your account has been upgraded successfully.`,
      newBalance,
      chargeAmount: price,
      expiresAt,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message ?? 'Unexpected error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
