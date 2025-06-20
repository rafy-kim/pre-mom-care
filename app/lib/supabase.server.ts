import { createServerClient, type CookieOptions } from '@supabase/ssr'

export const createSupabaseServerClient = (request: Request) => {
  const cookies: Record<string, string> = {}
  const allCookies = request.headers.get('Cookie')
  if (allCookies) {
    allCookies.split(';').forEach((cookie) => {
      const parts = cookie.split('=')
      cookies[parts[0].trim()] = parts.slice(1).join('=')
    })
  }

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookies[name]
        },
        set(name: string, value: string, options: CookieOptions) {
          // This space is intentionally left blank for server-side operations
          // where setting cookies on the request object itself is not applicable.
          // Cookie handling will be managed in a different part of the Remix flow,
          // typically when constructing the response.
        },
        remove(name: string, options: CookieOptions) {
          // Similarly, this is handled when building the response.
        },
      },
    }
  )

  return { supabase }
} 