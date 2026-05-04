/**
 * Edge Function: kyc-upload
 *
 * Handles KYC document uploads using service role (bypasses Storage RLS):
 *   1. Verifies authenticated user
 *   2. Creates 'kyc-documents' bucket if it doesn't exist
 *   3. Uploads base64-encoded file to the bucket
 *   4. Returns the public URL
 *
 * Body: { path: string, contentType: string, data: string (base64) }
 *
 * Deploy:
 *   supabase functions deploy kyc-upload
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

    const body = await req.json();
    const { action } = body;

    // ── Action: submit KYC row (status → pending) ──────────────────────────────
    if (action === 'submit') {
      const { doc_type, doc_url, selfie_url } = body as {
        doc_type: string; doc_url?: string; selfie_url?: string;
      };
      const now = new Date().toISOString();
      const { error: upsertErr } = await serviceClient
        .from('kyc')
        .upsert(
          { user_id: user.id, status: 'pending', doc_type, doc_url, selfie_url, submitted_at: now, updated_at: now },
          { onConflict: 'user_id' }
        );
      if (upsertErr) {
        return new Response(JSON.stringify({ error: upsertErr.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Default: file upload ───────────────────────────────────────────────────
    const { path, contentType, data } = body;

    if (!path || !data) {
      return new Response(JSON.stringify({ error: 'path and data are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ensure the path is scoped to the authenticated user (security guard)
    if (!path.startsWith(`${user.id}/`)) {
      return new Response(JSON.stringify({ error: 'Path must start with your user ID' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ensure bucket exists
    const { data: buckets } = await serviceClient.storage.listBuckets();
    const bucketExists = (buckets ?? []).some((b: { id: string }) => b.id === 'kyc-documents');
    if (!bucketExists) {
      const { error: bucketErr } = await serviceClient.storage.createBucket('kyc-documents', { public: true });
      if (bucketErr && !bucketErr.message.includes('already exists')) {
        return new Response(JSON.stringify({ error: `Failed to create bucket: ${bucketErr.message}` }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Decode base64 and upload
    const binaryStr = atob(data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const { error: uploadErr } = await serviceClient.storage
      .from('kyc-documents')
      .upload(path, bytes, {
        contentType: contentType ?? 'image/jpeg',
        upsert: true,
      });

    if (uploadErr) {
      return new Response(JSON.stringify({ error: `Upload failed: ${uploadErr.message}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: urlData } = serviceClient.storage.from('kyc-documents').getPublicUrl(path);

    return new Response(JSON.stringify({ success: true, publicUrl: urlData.publicUrl }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message ?? 'Unexpected error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
