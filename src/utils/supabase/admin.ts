import { createClient } from "@supabase/supabase-js";

// NEVER import this file in client components or expose this key to the frontend.
// SUPABASE_SERVICE_ROLE_KEY bypasses RLS and must only be used in trusted server code.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
