import type { H3Event } from 'h3'
import { clearAuthCookies } from './auth-cookies'
import { clearAuthUserCookie } from './auth-user'

type ResolveSessionExpiresAtOptions = {
  accessToken?: string | null
  existingExpiresAt?: number | null
  sessionExpiresAt?: number | null
}

type AuthErrorLike = {
  status?: unknown
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
  return Buffer.from(`${normalized}${padding}`, 'base64').toString('utf8')
}

export function getAccessTokenExpiresAt(accessToken?: string | null) {
  if (!accessToken)
    return null

  const [, payload] = accessToken.split('.')
  if (!payload)
    return null

  try {
    const parsed = JSON.parse(decodeBase64Url(payload)) as { exp?: unknown }
    return typeof parsed.exp === 'number' ? parsed.exp : null
  } catch {
    return null
  }
}

export function resolveSessionExpiresAt(options: ResolveSessionExpiresAtOptions) {
  return options.sessionExpiresAt
    ?? options.existingExpiresAt
    ?? getAccessTokenExpiresAt(options.accessToken)
    ?? null
}

export function isInvalidAuthError(error: AuthErrorLike | null | undefined) {
  const status = typeof error?.status === 'number' ? error.status : null
  return status === 400 || status === 401 || status === 403
}

export function clearAuthSession(event: H3Event) {
  clearAuthCookies(event)
  clearAuthUserCookie(event)
}
