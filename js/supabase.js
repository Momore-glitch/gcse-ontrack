/* GCSE OnTrack — Supabase client */

const SUPABASE_URL =
  "https://zsgwjcnbislvulcpiult.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_gymF3VtL_FtEey9bxJSmdw_ZnMFiNLo";

if (!window.supabase || typeof window.supabase.createClient !== "function") {
  console.error("Supabase library failed to load.");
} else {

  window.supabaseClient =
    window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );

  console.log("GCSE OnTrack: Supabase connected.");
}
