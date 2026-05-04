/**
 * Edge Function: admin-approve-transaction
 *
 * Approve or reject a pending deposit/withdrawal request.
 * Uses service role to bypass RLS.
 *
 * Actions:
 *   list    → return all pending deposit/withdraw transactions
 *   approve → for deposit: credit wallet + mark completed
 *              for withdraw: mark completed (wallet already debited)
 *   reject  → for deposit: mark failed
 *              for withdraw: refund wallet + mark failed
 *
 * Deploy:
 *   supabase functions deploy admin-approve-transaction
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const svc = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Verify caller
    const { data: { user }, error: authError } = await svc.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify admin
    const { data: profile } = await svc
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action } = body as { action: string };

    // ── LIST pending transactions ──────────────────────────────────────────────
    if (action === 'list') {
      const { data, error } = await svc
        .from('transactions')
        .select('*, profiles:user_id(full_name, email)')
        .eq('status', 'pending')
        .in('type', ['deposit', 'withdraw'])
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return new Response(JSON.stringify({ transactions: data ?? [] }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── APPROVE or REJECT ──────────────────────────────────────────────────────
    const { txId, decision } = body as { txId: string; decision: 'approve' | 'reject' };
    if (!txId || !decision) {
      return new Response(JSON.stringify({ error: 'txId and decision are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch transaction
    const { data: tx, error: txErr } = await svc
      .from('transactions')
      .select('*')
      .eq('id', txId)
      .single();
    if (txErr || !tx) {
      return new Response(JSON.stringify({ error: 'Transaction not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date().toISOString();
    const assetCol = (tx.asset as string).toLowerCase();

    if (decision === 'approve') {
      if (tx.type === 'deposit') {
        // Credit wallet for deposits
        const { data: wallet, error: walletErr } = await svc.from('wallets').select('*').eq('user_id', tx.user_id).single();
        if (walletErr || !wallet) throw new Error('Wallet not found for user');
        const current = Number(wallet[assetCol] ?? 0);
        const newBal = current + Number(tx.amount);
        const { error: wUpdateErr } = await svc.from('wallets')
          .update({ [assetCol]: newBal, updated_at: now })
          .eq('user_id', tx.user_id);
        if (wUpdateErr) throw new Error('Failed to credit wallet: ' + wUpdateErr.message);
      }
      // For withdrawals: wallet already debited — just mark completed
      const { error: txUpdateErr } = await svc.from('transactions')
        .update({ status: 'completed' })
        .eq('id', txId);
      if (txUpdateErr) throw new Error('Failed to update transaction status: ' + txUpdateErr.message);
    } else {
      // REJECT
      if (tx.type === 'withdraw') {
        // Refund wallet: return amount + fee that was deducted
        const refundAmount = Number(tx.amount) + Number(tx.fee ?? 0);
        const { data: wallet, error: walletErr } = await svc.from('wallets').select('*').eq('user_id', tx.user_id).single();
        if (walletErr || !wallet) throw new Error('Wallet not found for user');
        const current = Number(wallet[assetCol] ?? 0);
        const { error: wUpdateErr } = await svc.from('wallets')
          .update({ [assetCol]: current + refundAmount, updated_at: now })
          .eq('user_id', tx.user_id);
        if (wUpdateErr) throw new Error('Failed to refund wallet: ' + wUpdateErr.message);
      }
      const { error: txUpdateErr } = await svc.from('transactions')
        .update({ status: 'failed' })
        .eq('id', txId);
      if (txUpdateErr) throw new Error('Failed to update transaction status: ' + txUpdateErr.message);
    }

    // Log
    await svc.from('admin_logs').insert({
      admin_id: user.id,
      action: decision === 'approve' ? 'TRANSACTION_APPROVED' : 'TRANSACTION_REJECTED',
      target_user_id: tx.user_id,
      details: `${decision === 'approve' ? 'Approved' : 'Rejected'} ${tx.type} of ${tx.amount} ${(tx.asset as string).toUpperCase()}`,
      created_at: now,
    }).then(() => {}).catch(() => {});

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message ?? 'Unexpected error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
