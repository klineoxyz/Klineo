import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  if (import.meta.env.DEV) {
    console.error('Missing Supabase environment variables:');
    console.error('  - VITE_SUPABASE_URL:', supabaseUrl ? '✅' : '❌ Missing');
    console.error('  - VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅' : '❌ Missing');
    console.error('\nPlease add these to your .env.local file or Vercel environment variables.');
  }
  throw new Error('Missing Supabase environment variables');
}

// Create and export Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
