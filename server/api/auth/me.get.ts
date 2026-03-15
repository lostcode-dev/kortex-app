import { getSupabaseAnonClient } from '../../utils/supabase-anon'
import { getAccessTokenFromCookies, getRefreshTokenFromCookies, setAuthCookies } from '../../utils/auth-cookies'
import { getAuthUserCookie, setAuthUserCookie, toAuthUser } from '../../utils/auth-user'
import { clearAuthSession, isInvalidAuthError, resolveSessionExpiresAt } from '../../utils/auth-session'

export default eventHandler(async (event) => {
  const supabase = getSupabaseAnonClient()
  const accessToken = getAccessTokenFromCookies(event)
  const refreshToken = getRefreshTokenFromCookies(event)
  let accessTokenError: { status?: unknown } | null = null

  if (accessToken) {
    const { data, error } = await supabase.auth.getUser(accessToken)
    if (!error && data.user) {
      const existing = getAuthUserCookie(event)
      const expiresAt = resolveSessionExpiresAt({
        accessToken,
        existingExpiresAt: existing?.expiresAt
      })

      setAuthUserCookie(event, {
        user: toAuthUser(data.user),
        expiresAt,
        syncedAt: Date.now()
      })

      return {
        user: toAuthUser(data.user),
        session: { expiresAt }
      }
    }

    accessTokenError = error
  }

  if (!refreshToken) {
    if (accessToken && accessTokenError && !isInvalidAuthError(accessTokenError)) {
      throw createError({
        statusCode: 503,
        statusMessage: 'Auth service unavailable'
      })
    }

    clearAuthSession(event)
    return { user: null, session: null }
  }

  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession({
    refresh_token: refreshToken
  })

  if (refreshError && !isInvalidAuthError(refreshError)) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Auth service unavailable'
    })
  }

  if (refreshError || !refreshed.session) {
    clearAuthSession(event)
    return { user: null, session: null }
  }

  const expiresAt = resolveSessionExpiresAt({
    accessToken: refreshed.session.access_token,
    sessionExpiresAt: refreshed.session.expires_at ?? null
  })

  const { data: userData, error: userError } = await supabase.auth.getUser(refreshed.session.access_token)

  if (userError && !isInvalidAuthError(userError)) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Auth service unavailable'
    })
  }

  if (userError) {
    clearAuthSession(event)
    return { user: null, session: null }
  }

  if (userData.user) {
    setAuthUserCookie(event, {
      user: toAuthUser(userData.user),
      expiresAt,
      syncedAt: Date.now()
    })

    setAuthCookies(event, refreshed.session)

    return {
      user: toAuthUser(userData.user),
      session: { expiresAt }
    }
  }

  clearAuthSession(event)
  return { user: null, session: null }
})
