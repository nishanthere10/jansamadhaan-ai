import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'

/**
 * Server-side Supabase client (cookie read/write).
 *
 * KEPT INTENTIONALLY — not currently imported by the app, and NOT usable from
 * the Vite SPA bundle: it relies on `process.env` and the Web `Request` object,
 * which only exist in an SSR runtime.
 *
 * Wire this up only if the frontend moves to an SSR framework (Next.js /
 * React Router SSR). Until then the app is a pure SPA and uses `lib/api.ts`.
 *
 * See DEAD_CODE_REGISTER.md (frontend entry "supabase clients").
 */
export function createClient(request: Request) {
  const headers = new Headers()

  const supabase = createServerClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get('Cookie') ?? '') as {
            name: string
            value: string
          }[]
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            headers.append('Set-Cookie', serializeCookieHeader(name, value, options))
          )
        },
      },
    }
  )

  return { supabase, headers }
}
