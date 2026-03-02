import { getSupabaseAnonClient } from '../../utils/supabase-anon'
import { getAccessTokenFromCookies, getRefreshTokenFromCookies, setAuthCookies } from '../../utils/auth-cookies'
import { getAuthUserCookie, setAuthUserCookie, toAuthUser } from '../../utils/auth-user'

export default eventHandler(async (event) => {
  const supabase = getSupabaseAnonClient()
  const accessToken = getAccessTokenFromCookies(event)
  const refreshToken = getRefreshTokenFromCookies(event)

  if (accessToken) {
    const { data, error } = await supabase.auth.getUser(accessToken)
    if (!error && data.user) {
      const existing = getAuthUserCookie(event)
      setAuthUserCookie(event, {
        user: toAuthUser(data.user),
        expiresAt: existing?.expiresAt ?? null,
        syncedAt: Date.now()
      })

      return { user: toAuthUser(data.user) }
    }
  }

  if (!refreshToken)
    return { user: null }

  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession({
    refresh_token: refreshToken
  })

  if (refreshError || !refreshed.session)
    return { user: null }

  setAuthCookies(event, refreshed.session)

  const { data: userData, error: userError } = await supabase.auth.getUser(refreshed.session.access_token)

  if (userError)
    return { user: null }

  if (userData.user) {
    setAuthUserCookie(event, {
      user: toAuthUser(userData.user),
      expiresAt: refreshed.session.expires_at ?? null,
      syncedAt: Date.now()
    })
  }

  return { user: userData.user ? toAuthUser(userData.user) : null }
})
