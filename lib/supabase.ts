import { createClient } from "@supabase/supabase-js";

// Guarded singleton: when the env vars are absent (e.g. local dev before the
// project is wired, or a preview without secrets) `supabase` is null and the
// memories layer falls back to localStorage so the UI still works.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = url && anon ? createClient(url, anon) : null;
export const hasSupabase = supabase !== null;
