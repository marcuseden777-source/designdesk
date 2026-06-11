import { createClient } from "@supabase/supabase-js";

// Service-role client — full DB access, never sent to frontend
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
