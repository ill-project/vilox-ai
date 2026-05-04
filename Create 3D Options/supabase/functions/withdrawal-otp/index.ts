/**
 * Edge Function: withdrawal-otp
 *
 * Generates, stores, and sends a 6-digit OTP for withdrawal confirmation.
 * Uses Resend API for email delivery (set RESEND_API_KEY + FROM_EMAIL secrets).
 *
 * Actions:
 *   send   – generate code, store in withdrawal_otps, email to user
 *   verify – validate code, mark used, return success
 *
 * Required table (run once in Supabase SQL editor):
 *   CREATE TABLE IF NOT EXISTS public.withdrawal_otps (
 *     id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *     user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 *     code       TEXT NOT NULL,
 *     expires_at TIMESTAMPTZ NOT NULL,
 *     used       BOOLEAN NOT NULL DEFAULT FALSE,
 *     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 *   );
 *
 * Deploy:
 *   supabase functions deploy withdrawal-otp
 *   supabase secrets set RESEND_API_KEY=re_xxx FROM_EMAIL=noreply@yourdomain.com
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function randomCode(): string {
  // Cryptographically random 6-digit code
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(arr[0] % 1000000).padStart(6, '0');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data: { user }, error: userError } = await serviceClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userError || !user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json() as { action: string; code?: string };
    const { action } = body;

    // ── SEND ──────────────────────────────────────────────────────────────────
    if (action === 'send') {
      const code = randomCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

      // Invalidate any previous unused codes for this user
      await serviceClient
        .from('withdrawal_otps')
        .update({ used: true })
        .eq('user_id', user.id)
        .eq('used', false);

      // Insert new code
      const { error: insertErr } = await serviceClient
        .from('withdrawal_otps')
        .insert({ user_id: user.id, code, expires_at: expiresAt });

      if (insertErr) return json({ error: 'Failed to generate code' }, 500);

      // Send email
      const resendKey = Deno.env.get('RESEND_API_KEY');
      const fromEmail = Deno.env.get('FROM_EMAIL') ?? 'noreply@vilox.ai';

      if (resendKey) {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: user.email,
            subject: 'Your Vilox AI Withdrawal Code',
            html: `
              <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#0B0F1A;color:#fff;padding:32px;border-radius:16px;border:1px solid #1F2937;">
                <div style="margin-bottom:24px;">
                  <h1 style="margin:0;font-size:20px;color:#fff;">Vilox AI</h1>
                  <p style="margin:4px 0 0;color:#6B7280;font-size:13px;">Secure Withdrawal Verification</p>
                </div>
                <p style="color:#9CA3AF;margin:0 0 20px;font-size:15px;">Your one-time withdrawal code is:</p>
                <div style="background:#1F2937;border-radius:12px;padding:28px;text-align:center;margin:0 0 24px;border:1px solid #374151;">
                  <span style="font-size:44px;font-weight:900;letter-spacing:14px;color:#4C6FFF;font-family:monospace;">${code}</span>
                </div>
                <p style="color:#9CA3AF;font-size:13px;margin:0 0 8px;">&#x23F1; This code expires in <strong style="color:#fff;">10 minutes</strong>.</p>
                <p style="color:#9CA3AF;font-size:13px;margin:0 0 24px;">&#x1F512; Do not share this code with anyone, including Vilox AI staff.</p>
                <hr style="border:none;border-top:1px solid #1F2937;margin:0 0 16px;" />
                <p style="color:#6B7280;font-size:12px;margin:0;">If you did not request a withdrawal, please contact support immediately.</p>
              </div>
            `,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({})) as { message?: string };
          return json({ error: `Email send failed: ${errData.message ?? res.statusText}` }, 500);
        }
      } else {
        return json({ error: 'Email delivery not configured. Set RESEND_API_KEY secret on this function.' }, 503);
      }

      return json({ success: true, email: user.email });
    }

    // ── VERIFY ────────────────────────────────────────────────────────────────
    if (action === 'verify') {
      const { code } = body;
      if (!code || code.length !== 6) return json({ error: 'Invalid code format' }, 400);

      const { data: otpRow, error: fetchErr } = await serviceClient
        .from('withdrawal_otps')
        .select('id, code, expires_at, used')
        .eq('user_id', user.id)
        .eq('used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchErr || !otpRow) return json({ error: 'No active code found. Request a new one.' }, 400);

      if (new Date(otpRow.expires_at) < new Date()) {
        return json({ error: 'Code has expired. Request a new one.' }, 400);
      }

      if (otpRow.code !== code) return json({ error: 'Incorrect code. Try again.' }, 400);

      // Mark as used
      await serviceClient.from('withdrawal_otps').update({ used: true }).eq('id', otpRow.id);

      return json({ success: true });
    }

    return json({ error: 'Unknown action' }, 400);

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message ?? 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
