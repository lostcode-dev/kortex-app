import type { User } from '@supabase/supabase-js'
import type { H3Event } from 'h3'

export type AuthUser = {
  id: string
  email: string | null
  user_metadata: Record<string, unknown>
}

export type AuthUserCookiePayload = {
  user: AuthUser
  expiresAt: number | null
  syncedAt: number
}

type CookieOptions = {
  persistent?: boolean
}

const USER_COOKIE = 'sb-user'

function getBaseOptions() {
  return {
    httpOnly: false,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  }
}

export function toAuthUser(user: User): AuthUser {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>

  return {
    id: user.id,
    email: user.email ?? null,
    user_metadata: {
      name: meta.name,
      avatar_url: meta.avatar_url
    }
  }
}

export function setAuthUserCookie(event: H3Event, payload: AuthUserCookiePayload, options?: CookieOptions) {
  const value = encodeURIComponent(JSON.stringify(payload))

  const isPersistent = options?.persistent ?? true

  setCookie(event, USER_COOKIE, value, isPersistent
    ? { ...getBaseOptions(), maxAge: 60 * 60 * 24 * 30 }
    : { ...getBaseOptions() })
}

export function clearAuthUserCookie(event: H3Event) {
  setCookie(event, USER_COOKIE, '', {
    ...getBaseOptions(),
    maxAge: 0
  })
}

export function getAuthUserCookie(event: H3Event): AuthUserCookiePayload | null {
  const raw = getCookie(event, USER_COOKIE)
  if (!raw)
    return null

  const attempts = [raw]

  try {
    const decoded = decodeURIComponent(raw)
    if (!attempts.includes(decoded))
      attempts.push(decoded)
  } catch {
    // Ignore malformed URI sequences and try other strategies below.
  }

  try {
    const decodedTwice = decodeURIComponent(attempts[attempts.length - 1]!)
    if (!attempts.includes(decodedTwice))
      attempts.push(decodedTwice)
  } catch {
    // Ignore malformed URI sequences and fall back to the successful attempts.
  }

  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt) as unknown
      if (parsed && typeof parsed === 'object' && 'user' in parsed)
        return parsed as AuthUserCookiePayload
    } catch {
      // Try the next decoding attempt.
    }
  }

  return null
}
