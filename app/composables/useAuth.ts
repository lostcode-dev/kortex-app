export type AuthUser = {
  id: string
  email: string | null
  user_metadata: Record<string, unknown>
}

type AuthUserCookiePayload = {
  user: AuthUser
  expiresAt: number | null
  syncedAt: number
}

type AuthSession = {
  expiresAt: number | null
}

type AuthState = {
  user: AuthUser | null
  ready: boolean
}

const AUTH_REFRESH_BUFFER_MS = 60_000
const AUTH_COOKIE_REVALIDATE_MS = 5 * 60_000

export function useAuth() {
  const userCookie = useCookie<string | null>('sb-user', { default: () => null })

  const state = useState<AuthState>('auth', () => {
    const parsed = parseUserCookie()
    if (!parsed)
      return { user: null, ready: false }

    return { user: parsed.user, ready: true }
  })

  const user = computed(() => state.value.user)
  const ready = computed(() => state.value.ready)
  const isAuthenticated = computed(() => Boolean(state.value.user))

  function parseUserCookie(): AuthUserCookiePayload | null {
    const raw = userCookie.value
    if (!raw)
      return null

    try {
      return JSON.parse(decodeURIComponent(raw)) as AuthUserCookiePayload
    } catch {
      return null
    }
  }

  function setUserCookie(user: AuthUser, session: AuthSession | null = null) {
    const payload: AuthUserCookiePayload = {
      user,
      expiresAt: session?.expiresAt ?? null,
      syncedAt: Date.now()
    }

    userCookie.value = encodeURIComponent(JSON.stringify(payload))
  }

  function clearUserState() {
    state.value.user = null
    userCookie.value = null
  }

  async function fetchUser(): Promise<AuthUser | null> {
    try {
      const response = await $fetch<{ user: AuthUser | null, session: AuthSession | null }>('/api/auth/me', { credentials: 'include' })

      if (response.user)
        setUserCookie(response.user, response.session)
      else
        clearUserState()

      state.value.user = response.user
      state.value.ready = true
      return response.user
    } catch {
      state.value.user = state.value.user ?? parseUserCookie()?.user ?? null
      state.value.ready = true
      if (!state.value.user)
        userCookie.value = null

      return state.value.user
    }
  }

  function isTokenExpired(): boolean {
    const parsed = parseUserCookie()
    if (!parsed)
      return true

    if (!parsed.expiresAt)
      return parsed.syncedAt <= Date.now() - AUTH_COOKIE_REVALIDATE_MS

    return parsed.expiresAt * 1000 <= Date.now() + AUTH_REFRESH_BUFFER_MS
  }

  async function ensureReady() {
    if (state.value.ready) {
      // Even when ready, proactively refresh if token is near expiry
      if (state.value.user && isTokenExpired()) {
        await fetchUser()
      }
      return
    }

    const parsed = parseUserCookie()
    if (parsed) {
      state.value.user = parsed.user
      state.value.ready = true

      if (isTokenExpired())
        await fetchUser()

      return
    }

    await fetchUser()
  }

  async function login(payload: { email: string, password: string, remember?: boolean }) {
    const response = await $fetch<{ user: AuthUser, session: AuthSession }>('/api/auth/login', {
      method: 'POST',
      body: payload,
      credentials: 'include'
    })

    setUserCookie(response.user, response.session)
    state.value.user = response.user
    state.value.ready = true
    return response.user
  }

  async function signup(payload: { name: string, email: string, password: string }) {
    const response = await $fetch<{ user: AuthUser | null, session: { expiresAt: number | null } | null }>('/api/auth/signup', {
      method: 'POST',
      body: payload,
      credentials: 'include'
    })

    if (response.session) {
      if (response.user)
        setUserCookie(response.user, response.session)

      state.value.user = response.user
      state.value.ready = true
    }

    return response
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    state.value.user = null
    state.value.ready = true
    userCookie.value = null
  }

  return {
    user,
    ready,
    isAuthenticated,
    fetchUser,
    ensureReady,
    login,
    signup,
    logout
  }
}
