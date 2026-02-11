import "client-only";
// Add util functions that should only be run in client components. Importing these in server components will throw an error.
// For more info on how to avoid poisoning your server/client components: https://www.youtube.com/watch?v=BZlwtR9pDp4
import { env } from "@/env.mjs";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./schema";

// Create Supabase client (for client components)
// Injects type dependencies from database schema
export const createBrowserSupabaseClient = () => {
  const supabaseClient = createBrowserClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  return supabaseClient;
};
