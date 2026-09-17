import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser-side Supabase client (cookie-based, @supabase/ssr flavour).
 *
 * KEPT INTENTIONALLY — not currently imported by the app. This is the client to
 * use if/when the frontend needs cookie-backed Supabase sessions. The active
 * app talks to the backend through `lib/api.ts` (`fetchWithAuth`) instead.
 *
 * See DEAD_CODE_REGISTER.md (frontend entry "supabase clients").
 */
export function createClient() {
  return createBrowserClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_ANON_KEY!
  )
}
