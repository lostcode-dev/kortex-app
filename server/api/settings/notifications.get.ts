import { requireAuthUser } from '../../utils/require-auth'
import { getSupabaseAdminClient } from '../../utils/supabase'
import {
  getDefaultNotificationPreferences,
  mapNotificationPreferencesRecord,
  type NotificationPushSubscriptionRecord
} from '../../utils/notification-settings'

export default eventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const supabase = getSupabaseAdminClient()

  const [{ data, error }, { data: subscriptions, error: subscriptionsError }] = await Promise.all([
    supabase
      .from('notification_preferences')
      .select('channel_in_app, channel_email, channel_web_push, channel_mobile_push, habit_reminders, weekly_digest, product_updates, important_updates, web_push_permission, mobile_push_permission')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('notification_push_subscriptions')
      .select('id, provider, device_key, channel, platform, app_context, onesignal_subscription_id, permission, opted_in, last_seen_at')
      .eq('user_id', user.id)
      .order('last_seen_at', { ascending: false })
      .limit(12)
      .returns<NotificationPushSubscriptionRecord[]>()
  ])

  if (error && error.code !== 'PGRST116') {
    throw createError({
      statusCode: 500,
      statusMessage: 'Não foi possível carregar as preferências'
    })
  }

  if (subscriptionsError) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Não foi possível carregar os dispositivos configurados'
    })
  }

  const preferences = data
    ? mapNotificationPreferencesRecord(data)
    : getDefaultNotificationPreferences()

  return {
    ...preferences,
    subscriptions: (subscriptions ?? []).map(subscription => ({
      id: subscription.id,
      provider: subscription.provider,
      deviceKey: subscription.device_key,
      channel: subscription.channel,
      platform: subscription.platform,
      appContext: subscription.app_context,
      oneSignalSubscriptionId: subscription.onesignal_subscription_id,
      permission: subscription.permission,
      optedIn: subscription.opted_in,
      lastSeenAt: subscription.last_seen_at
    }))
  }
})
