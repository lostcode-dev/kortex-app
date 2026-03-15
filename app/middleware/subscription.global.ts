import { useAuth } from '~/composables/useAuth'
import { useBilling } from '~/composables/useBilling'

export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/app'))
    return

  const shouldRetry = to.query?.checkout === 'success'
  const isSubscriptionRoute = to.path.startsWith('/app/settings/subscription')

  // Billing is only relevant on the subscription flow itself or right after checkout.
  // Running it on every /app route introduces an auth side-effect unrelated to navigation.
  if (!shouldRetry && !isSubscriptionRoute)
    return

  const auth = useAuth()

  if (!auth.isAuthenticated.value)
    return

  const billing = useBilling()

  try {
    if (!shouldRetry) {
      await billing.ensureReady()
    } else {
      for (let attempt = 0; attempt < 3; attempt++) {
        await billing.fetchStatus()
        if (billing.hasAccess.value)
          return

        await new Promise(resolve => setTimeout(resolve, 1200))
      }
    }
  } catch (error: unknown) {
    const err = error as { statusCode?: number, status?: number }
    const statusCode = err?.statusCode || err?.status
    if (statusCode === 401)
      return
    // return navigateTo('/app/subscribe')
  }

  // if (!billing.hasAccess.value)
  //   return navigateTo('/app/subscribe')
})
