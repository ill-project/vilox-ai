/**
 * supabaseAdminPanel.ts
 *
 * Isolated Supabase client for the admin panel.
 * Uses a separate storageKey ('vilox-admin-session') so admin sessions never
 * bleed into or replace the main site user session.
 *
 * Import this (not supabaseClient.ts) in admin-main.tsx and anywhere that
 * needs the admin session token (e.g. callEdgeFunction fallback in db.ts).
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://adkmouuqcaehzwkxtmew.supabase.co';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'sb_publishable_VoH6HQ6P85GguaJKsjrHUA_k2nxPTaS';

export const supabaseAdminPanel = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storageKey: 'vilox-admin-session' },
});
