/**
 * supabaseClient.ts — BROWSER-SAFE client
 *
 * Uses the public anon key. Subject to Row Level Security.
 * Safe to import in any React component or page.
 * Never put the service role key here.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://adkmouuqcaehzwkxtmew.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_VoH6HQ6P85GguaJKsjrHUA_k2nxPTaS';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Supabase env vars missing — using hardcoded fallback');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
