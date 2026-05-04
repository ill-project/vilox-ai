/**
 * supabase.ts — legacy re-export shim
 *
 * All code still imports from './supabase' — this keeps those imports working
 * while the real browser-safe client lives in ./supabaseClient.ts
 *
 * supabaseAdmin is intentionally NOT re-exported here.
 * Use ./supabaseAdmin.ts inside Edge Functions only.
 */
export { supabase } from './supabaseClient';
