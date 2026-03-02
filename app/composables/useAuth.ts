export type AuthUser = {
  id: string
  email: string | null
  user_metadata: Record<string, any>
}

type AuthUserCookiePayload = {
  user: AuthUser
  expiresAt: number | null
  syncedAt: number
}

type AuthState = {
  user: AuthUser | null
  ready: boolean
}

export function useAuth() {
  const userCookie = useCookie<string | null>('sb-user', { default: () => null })

  const state = useState<AuthState>('auth', () => {
    const raw = userCookie.value
    if (!raw)
      return { user: null, ready: false }

    try {
      const parsed = JSON.parse(decodeURIComponent(raw)) as AuthUserCookiePayload
      return { user: parsed.user, ready: true }
    }
    catch {
      return { user: null, ready: false }
    }
  })

  const user = computed(() => state.value.user)
  const ready = computed(() => state.value.ready)
  const isAuthenticated = computed(() => Boolean(state.value.user))

  async function fetchUser() {
    const response = await $fetch<{ user: AuthUser | null }>('/api/auth/me')
    state.value.user = response.user
    state.value.ready = true
    return response.user
  }

  async function ensureReady() {
    if (state.value.ready)
      return

    const raw = userCookie.value
    if (raw) {
      try {
        const parsed = JSON.parse(decodeURIComponent(raw)) as AuthUserCookiePayload
        state.value.user = parsed.user
        state.value.ready = true

        if (parsed.expiresAt && parsed.expiresAt * 1000 <= Date.now())
          await fetchUser()

        return
      }
      catch {
        // ignore
      }
    }

    await fetchUser()
  }

  async function login(payload: { email: string, password: string }) {
    const response = await $fetch<{ user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: payload
    })

    state.value.user = response.user
    state.value.ready = true
    return response.user
  }

  async function signup(payload: { name: string, email: string, password: string }) {
    const response = await $fetch<{ user: AuthUser | null, session: { expiresAt: number | null } | null }>('/api/auth/signup', {
      method: 'POST',
      body: payload
    })

    if (response.session) {
      state.value.user = response.user
      state.value.ready = true
    }

    return response
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
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
