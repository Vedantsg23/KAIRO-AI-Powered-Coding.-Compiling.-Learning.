/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL, e.g. https://abcd1234.supabase.co (optional: enables account sign-in). */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase publishable (anon) key. Safe to ship to browsers; never put a service-role key here. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
