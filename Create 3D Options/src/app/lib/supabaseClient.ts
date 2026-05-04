/**
 * supabaseClient.ts — BROWSER-SAFE client
 *
 * Uses the public anon key. Subject to Row Level Security.
 * Safe to import in any React component or page.
 * Never put the service role key here.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
