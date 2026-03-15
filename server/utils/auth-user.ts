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

  try {
    return JSON.parse(decodeURIComponent(raw)) as AuthUserCookiePayload
  } catch {
    return null
  }
}
