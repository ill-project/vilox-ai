/**
 * Edge Function: admin-impersonate
 *
 * Generates a magic link for any user so the admin can log in as them.
 * Uses the service role key — runs only server-side in Supabase's runtime.
 *
 * Deploy with:
 *   supabase functions deploy admin-impersonate
 *
 * POST body: { userId: string }
 * Returns:   { url: string }
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
    // ── 1. Authenticate the calling admin ─────────────────────────────────────
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

    const { data: { user: caller }, error: callerErr } = await adminClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (callerErr || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 2. Verify caller is an admin ──────────────────────────────────────────
    const { data: profile } = await adminClient
      .from('profiles')
      .select('is_admin')
      .eq('id', caller.id)
      .single();

    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 3. Get target user email ───────────────────────────────────────────────
    const { userId } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: targetUser, error: targetErr } = await adminClient.auth.admin.getUserById(userId);
    if (targetErr || !targetUser?.user?.email) {
      return new Response(JSON.stringify({ error: 'User not found or has no email' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 4. Generate a magic link for the target user ───────────────────────────
    // Get the app URL from the request origin, fall back to env var
    const origin = req.headers.get('origin') || Deno.env.get('APP_URL') || 'https://adkmouuqcaehzwkxtmew.supabase.co';

    const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: targetUser.user.email,
      options: {
        redirectTo: `${origin}/app/dashboard`,
      },
    });

    if (linkErr || !linkData?.properties?.action_link) {
      return new Response(JSON.stringify({ error: linkErr?.message ?? 'Failed to generate link' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ url: linkData.properties.action_link }), {
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
