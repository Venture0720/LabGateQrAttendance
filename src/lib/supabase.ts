import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrlEnv = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKeyEnv = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Fallback values for build time or missing environment variables
// This prevents "supabaseUrl is required" error during Next.js prerendering/build.
const supabaseUrl = (supabaseUrlEnv && supabaseUrlEnv !== 'undefined') 
  ? supabaseUrlEnv 
  : 'https://placeholder.supabase.co';

const supabaseAnonKey = (supabaseAnonKeyEnv && supabaseAnonKeyEnv !== 'undefined') 
  ? supabaseAnonKeyEnv 
  : 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

