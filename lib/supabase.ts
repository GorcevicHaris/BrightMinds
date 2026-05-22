import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Klijent za frontend i standardne upite (sa anon ključem)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Klijent za backend (sa service role ključem - ima admin privilegije, koristi se samo u API rutama)
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : supabase;
