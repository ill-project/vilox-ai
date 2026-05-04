/**
 * Edge Function: admin-manage-user
 *
 * Performs admin-only profile mutations that bypass RLS:
 *   - block: set status='blocked', blocked_reason, blocked_at
 *   - unblock: set status='active', clear blocked fields
 *   - note: update admin_notes
 *
 * Body: { action: 'block'|'unblock'|'note', userId: string, reason?: string, note?: string }
 *
 * Deploy:
 *   supabase functions deploy admin-manage-user
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

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Verify caller
    const { data: { user }, error: userError } = await adminClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify admin
    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!callerProfile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, userId, reason, note, plan, kycStatus, symbol, address, network, min_deposit, is_active } = await req.json();

    if (!action) {
      return new Response(JSON.stringify({ error: 'Missing action' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date().toISOString();

    // ── list_pending_kyc: return all kyc rows with status=pending ─────────
    if (action === 'list_pending_kyc') {
      const { data, error } = await adminClient
        .from('kyc')
        .select('*, profiles(full_name, email)')
        .eq('status', 'pending')
        .order('submitted_at', { ascending: true });
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ success: true, kyc: data ?? [] }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── deposit address actions (no userId needed) ─────────────────────────
    if (action === 'list_deposit_addresses') {
      const { data, error } = await adminClient
        .from('deposit_addresses')
        .select('*')
        .order('symbol');
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ success: true, addresses: data ?? [] }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'upsert_deposit_address') {
      if (!symbol || !address) return new Response(JSON.stringify({ error: 'symbol and address required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const upsertData: Record<string, unknown> = { symbol, address, is_active: is_active ?? true };
      if (network !== undefined) upsertData.network = network ?? null;
      if (min_deposit !== undefined) upsertData.min_deposit = min_deposit ?? null;
      const { error } = await adminClient.from('deposit_addresses').upsert(upsertData, { onConflict: 'symbol' });
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'delete_deposit_address') {
      if (!symbol) return new Response(JSON.stringify({ error: 'symbol required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const { error } = await adminClient.from('deposit_addresses').delete().eq('symbol', symbol);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── user actions (userId required) ────────────────────────────────────
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── delete: remove user from auth + all their data ─────────────────────
    if (action === 'delete') {
      // Delete auth user (cascades to profiles via FK if set up, otherwise soft-delete profiles)
      const { error: authErr } = await adminClient.auth.admin.deleteUser(userId);
      if (authErr) {
        // Fallback: soft-delete in profiles
        await adminClient.from('profiles').update({ status: 'deleted', updated_at: now }).eq('id', userId);
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── update_kyc: update kyc table (service role bypasses RLS) ──────────
    if (action === 'update_kyc') {
      const kycUpdates: Record<string, string | null> = {
        status: kycStatus ?? 'pending',
        reviewed_at: now,
        updated_at: now,
      };
      if (reason) kycUpdates.rejection_reason = reason;
      const { error } = await adminClient.from('kyc').update(kycUpdates).eq('user_id', userId);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── profile updates ────────────────────────────────────────────────────
    let profileUpdates: Record<string, string | null> = {};

    if (action === 'block') {
      profileUpdates = {
        status: 'blocked',
        blocked_reason: reason ?? 'Admin action',
        blocked_at: now,
        updated_at: now,
      };
    } else if (action === 'unblock') {
      profileUpdates = {
        status: 'active',
        blocked_reason: null,
        blocked_at: null,
        updated_at: now,
      };
    } else if (action === 'note') {
      profileUpdates = {
        admin_notes: note ?? '',
        updated_at: now,
      };
    } else if (action === 'update_plan') {
      profileUpdates = {
        plan: plan ?? 'free',
        updated_at: now,
      };
    } else {
      return new Response(JSON.stringify({ error: 'Unknown action' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error } = await adminClient
      .from('profiles')
      .update(profileUpdates)
      .eq('id', userId);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
