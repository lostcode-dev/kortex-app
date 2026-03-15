import { z } from 'zod'
import { requireAuthUser } from '../../../utils/require-auth'
import { getSupabaseAdminClient } from '../../../utils/supabase'
import {
  NOTIFICATION_APP_CONTEXT_VALUES,
  NOTIFICATION_PERMISSION_VALUES,
  NOTIFICATION_PLATFORM_VALUES,
  NOTIFICATION_PUSH_CHANNEL_VALUES
} from '../../../utils/notification-settings'

const schema = z.object({
  provider: z.literal('onesignal'),
  deviceKey: z.string().trim().min(1).max(120),
  channel: z.enum(NOTIFICATION_PUSH_CHANNEL_VALUES),
  platform: z.enum(NOTIFICATION_PLATFORM_VALUES),
  appContext: z.enum(NOTIFICATION_APP_CONTEXT_VALUES),
  oneSignalSubscriptionId: z.string().trim().min(1).max(255).nullable(),
  oneSignalUserId: z.string().trim().min(1).max(255).nullable(),
  token: z.string().trim().min(1).max(4096).nullable(),
  permission: z.enum(NOTIFICATION_PERMISSION_VALUES),
  optedIn: z.boolean(),
  sdkVersion: z.string().trim().min(1).max(120).nullable(),
  appVersion: z.string().trim().min(1).max(120).nullable(),
  deviceModel: z.string().trim().min(1).max(255).nullable(),
  language: z.string().trim().min(1).max(32).nullable(),
  timezone: z.string().trim().min(1).max(120).nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().default({})
})

export default eventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Dados inválidos',
      data: parsed.error.flatten()
    })
  }

  const permissionField = parsed.data.channel === 'web_push'
    ? 'web_push_permission'
    : 'mobile_push_permission'

  const supabase = getSupabaseAdminClient()
  const now = new Date().toISOString()

  const [{ error: subscriptionError }, { error: preferenceError }] = await Promise.all([
    supabase
      .from('notification_push_subscriptions')
      .upsert({
        user_id: user.id,
        provider: parsed.data.provider,
        device_key: parsed.data.deviceKey,
        channel: parsed.data.channel,
        platform: parsed.data.platform,
        app_context: parsed.data.appContext,
        onesignal_subscription_id: parsed.data.oneSignalSubscriptionId,
        onesignal_user_id: parsed.data.oneSignalUserId,
        external_user_id: user.id,
        token: parsed.data.token,
        permission: parsed.data.permission,
        opted_in: parsed.data.optedIn,
        sdk_version: parsed.data.sdkVersion,
        app_version: parsed.data.appVersion,
        device_model: parsed.data.deviceModel,
        language: parsed.data.language,
        timezone: parsed.data.timezone,
        metadata: parsed.data.metadata,
        last_seen_at: now
      }, { onConflict: 'provider,device_key' }),
    supabase
      .from('notification_preferences')
      .upsert({
        user_id: user.id,
        [permissionField]: parsed.data.permission
      }, { onConflict: 'user_id' })
  ])

  if (subscriptionError || preferenceError) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Não foi possível sincronizar o dispositivo'
    })
  }

  return { ok: true }
})
