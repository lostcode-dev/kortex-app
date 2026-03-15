function normalizeCustomSchemePath(url: URL): string | null {
  const hostPath = url.host ? `/${url.host}` : ''
  const path = `${hostPath}${url.pathname}${url.search}${url.hash}`.replace(/\/{2,}/g, '/')
  return path.startsWith('/') ? path : null
}

function normalizePathCandidate(candidate: string, siteUrl?: string): string | null {
  const value = candidate.trim()
  if (!value)
    return null

  if (value.startsWith('/'))
    return value

  try {
    const url = new URL(value)
    const currentOrigin = import.meta.client ? window.location.origin : undefined
    const allowedOrigins = [currentOrigin, siteUrl].filter(Boolean) as string[]

    if (url.protocol === 'http:' || url.protocol === 'https:') {
      if (allowedOrigins.some((origin) => {
        try {
          return new URL(origin).origin === url.origin
        } catch {
          return false
        }
      })) {
        return `${url.pathname}${url.search}${url.hash}`
      }

      return null
    }

    return normalizeCustomSchemePath(url)
  } catch {
    return null
  }
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null
}

function getStringCandidates(value: unknown): string[] {
  return typeof value === 'string' ? [value] : []
}

export function extractNotificationTarget(
  payload: unknown,
  siteUrl?: string
): string | null {
  const record = getRecord(payload)
  const result = getRecord(record?.result)
  const notification = getRecord(record?.notification)
  const additionalData = getRecord(notification?.additionalData ?? record?.additionalData ?? record?.data)

  const candidates = [
    ...getStringCandidates(record?.linkPath),
    ...getStringCandidates(record?.link_path),
    ...getStringCandidates(record?.path),
    ...getStringCandidates(record?.route),
    ...getStringCandidates(record?.url),
    ...getStringCandidates(record?.deeplink),
    ...getStringCandidates(result?.url),
    ...getStringCandidates(notification?.launchURL),
    ...getStringCandidates(additionalData?.linkPath),
    ...getStringCandidates(additionalData?.link_path),
    ...getStringCandidates(additionalData?.path),
    ...getStringCandidates(additionalData?.route),
    ...getStringCandidates(additionalData?.url),
    ...getStringCandidates(additionalData?.deeplink)
  ]

  for (const candidate of candidates) {
    const normalized = normalizePathCandidate(candidate, siteUrl)
    if (normalized)
      return normalized
  }

  return null
}

export function extractNotificationId(payload: unknown): number | null {
  const record = getRecord(payload)
  const notification = getRecord(record?.notification)
  const additionalData = getRecord(notification?.additionalData ?? record?.additionalData ?? record?.data)

  const rawValue = additionalData?.notificationId ?? additionalData?.notification_id
  const numericValue = typeof rawValue === 'number'
    ? rawValue
    : typeof rawValue === 'string'
      ? Number(rawValue)
      : Number.NaN

  return Number.isFinite(numericValue) ? numericValue : null
}
