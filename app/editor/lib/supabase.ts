// Browser Supabase client for the 3D Layout Studio — same project as the
// DesignDesk app, so the same accounts work in both. The anon key is the
// public client key (it ships in every app bundle); auth state persists in
// localStorage so a designer stays signed in between visits.
"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Null when the env vars are missing (misconfigured deploy) — the login
 *  overlay shows a configuration error instead of crashing the page. */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: { persistSession: true, autoRefreshToken: true },
      })
    : null;
