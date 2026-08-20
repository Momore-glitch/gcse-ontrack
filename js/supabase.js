/* GCSE OnTrack — Supabase client */
const SUPABASE_URL="PASTE_YOUR_SUPABASE_PROJECT_URL_HERE";
const SUPABASE_PUBLISHABLE_KEY="PASTE_YOUR_SUPABASE_PUBLISHABLE_KEY_HERE";
const supabaseClient=(window.supabase&&SUPABASE_URL.startsWith("http"))
 ? window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY):null;
