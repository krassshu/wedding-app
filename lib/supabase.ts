import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabaseUrl = url;
export const supabaseAnonKey = anonKey;

export const supabase = createClient(
  url || "http://localhost:54321",
  anonKey || "public-anon-key",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);
