/**
 * Edge Function: admin-users
 *
 * Returns all profiles merged with real emails from auth.users.
 * Uses the service role key — runs only server-side in Supabase's runtime.
 *
 * Deploy with:
 *   supabase functions deploy admin-users
 *
 * Environment variables (set automatically by Supabase runtime):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── 1. Authenticate the calling user ──────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Admin client — only safe here (server-side Edge Function)
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Verify the caller is authenticated
    const { data: { user }, error: userError } = await adminClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 2. Verify caller is an admin (direct query, service role bypasses RLS) ──
    const { data: profile } = await adminClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 3. Fetch all profiles + auth emails ───────────────────────────────────
    const [profilesRes, authRes] = await Promise.all([
      adminClient
        .from('profiles')
        .select('*, wallets(*), kyc(status)')
        .order('created_at', { ascending: false }),
      adminClient.auth.admin.listUsers({ perPage: 1000 }),
    ]);

    if (profilesRes.error) throw profilesRes.error;

    // Build email map from auth.users
    const emailMap: Record<string, string> = {};
    for (const u of (authRes.data?.users ?? [])) {
      emailMap[u.id] = u.email ?? '';
    }

    const users = (profilesRes.data ?? []).map((p: Record<string, unknown>) => ({
      ...p,
      email: emailMap[p.id as string] ?? null,
    }));

    return new Response(JSON.stringify({ users }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
