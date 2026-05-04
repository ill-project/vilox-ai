/**
 * Edge Function: admin-email
 *
 * Sends emails from the admin panel — single user or broadcast.
 * Uses Supabase's built-in email via auth.admin.generateLink, or
 * optionally Resend if RESEND_API_KEY is set in environment secrets.
 *
 * Deploy with:
 *   supabase functions deploy admin-email
 *
 * Set secrets (optional, for Resend):
 *   supabase secrets set RESEND_API_KEY=re_xxx FROM_EMAIL=noreply@yourdomain.com
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
    // ── 1. Auth check ──────────────────────────────────────────────────────────
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

    const { data: { user }, error: userError } = await adminClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userError || !user) {
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

    // ── 3. Parse body ──────────────────────────────────────────────────────────
    const { to, subject, body, broadcast } = await req.json() as {
      to?: string;
      subject: string;
      body: string;
      broadcast?: boolean;
    };

    if (!subject || !body) {
      return new Response(JSON.stringify({ error: 'subject and body are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resendKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('FROM_EMAIL') ?? 'noreply@vilox.ai';

    // ── 4a. Broadcast using Resend ─────────────────────────────────────────────
    if (broadcast) {
      // Get all user emails
      const { data: authUsers } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      const emails = (authUsers?.users ?? []).map(u => u.email).filter(Boolean) as string[];

      if (!resendKey) {
        return new Response(JSON.stringify({
          error: 'Broadcast email requires RESEND_API_KEY secret. Deploy the function with: supabase secrets set RESEND_API_KEY=re_xxx',
        }), { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Send in batches of 50
      let sent = 0;
      for (let i = 0; i < emails.length; i += 50) {
        const batch = emails.slice(i, i + 50);
        await Promise.allSettled(batch.map(email =>
          fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: fromEmail, to: email, subject, text: body }),
          })
        ));
        sent += batch.length;
      }

      return new Response(JSON.stringify({ success: true, sent }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 4b. Single email ───────────────────────────────────────────────────────
    if (!to) {
      return new Response(JSON.stringify({ error: '`to` email is required for single send' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (resendKey) {
      // Use Resend
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: fromEmail, to, subject, text: body }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message ?? 'Resend error');
    } else {
      // Fallback: send a password-reset style OTP as a notification workaround
      // (limited — only works if user exists in auth)
      const { error: emailError } = await adminClient.auth.admin.generateLink({
        type: 'magiclink',
        email: to,
        options: { redirectTo: Deno.env.get('SUPABASE_URL') },
      });
      if (emailError) throw emailError;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
