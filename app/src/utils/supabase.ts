import { createClient } from '@supabase/supabase-js';

// Retrieve environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("meta.env", import.meta.env);
// Warn if keys are missing (helpful for dev)
if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase Config: Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
}

// Create and export the Supabase client
export const supabase = createClient(
    supabaseUrl || '',
    supabaseAnonKey || ''
);
