import { createClient } from '@supabase/supabase-js'

/**
 * Plain Supabase JS client for the Vite SPA.
 *
 * KEPT INTENTIONALLY — not currently imported by the app. This is the client to
 * wire up when the dev auth bypass in `components/auth/ProtectedRoute.tsx` and
 * `store/useAuthStore.ts` is replaced with real Supabase Auth.
 *
 * See DEAD_CODE_REGISTER.md (frontend entry "supabase clients").
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
