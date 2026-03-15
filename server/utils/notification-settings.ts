export const NOTIFICATION_PERMISSION_VALUES = ['default', 'granted', 'denied', 'unsupported'] as const
export const NOTIFICATION_CHANNEL_VALUES = ['in_app', 'email', 'web_push', 'mobile_push'] as const
export const NOTIFICATION_PUSH_CHANNEL_VALUES = ['web_push', 'mobile_push'] as const
export const NOTIFICATION_PLATFORM_VALUES = ['web', 'ios', 'android'] as const
export const NOTIFICATION_APP_CONTEXT_VALUES = ['browser', 'pwa', 'native'] as const

export type NotificationPermission = (typeof NOTIFICATION_PERMISSION_VALUES)[number]
export type NotificationChannel = (typeof NOTIFICATION_CHANNEL_VALUES)[number]
export type NotificationPushChannel = (typeof NOTIFICATION_PUSH_CHANNEL_VALUES)[number]
export type NotificationPlatform = (typeof NOTIFICATION_PLATFORM_VALUES)[number]
export type NotificationAppContext = (typeof NOTIFICATION_APP_CONTEXT_VALUES)[number]

export type NotificationPreferencesRecord = {
  channel_in_app: boolean
  channel_email: boolean
  channel_web_push: boolean
  channel_mobile_push: boolean
  habit_reminders: boolean
  weekly_digest: boolean
  product_updates: boolean
  important_updates: boolean
  web_push_permission: NotificationPermission
  mobile_push_permission: NotificationPermission
}

export type NotificationPushSubscriptionRecord = {
  id: string
  provider: 'onesignal'
  device_key: string
  channel: NotificationPushChannel
  platform: NotificationPlatform
  app_context: NotificationAppContext
  onesignal_subscription_id: string | null
  permission: NotificationPermission
  opted_in: boolean
  last_seen_at: string
}

export function getDefaultNotificationPreferences(): NotificationPreferencesRecord {
  return {
    channel_in_app: true,
    channel_email: true,
    channel_web_push: false,
    channel_mobile_push: false,
    habit_reminders: true,
    weekly_digest: false,
    product_updates: true,
    important_updates: true,
    web_push_permission: 'default',
    mobile_push_permission: 'default'
  }
}

export function mapNotificationPreferencesRecord(
  row: Partial<NotificationPreferencesRecord> | null | undefined
): NotificationPreferencesRecord {
  const defaults = getDefaultNotificationPreferences()

  return {
    channel_in_app: row?.channel_in_app ?? defaults.channel_in_app,
    channel_email: row?.channel_email ?? defaults.channel_email,
    channel_web_push: row?.channel_web_push ?? defaults.channel_web_push,
    channel_mobile_push: row?.channel_mobile_push ?? defaults.channel_mobile_push,
    habit_reminders: row?.habit_reminders ?? defaults.habit_reminders,
    weekly_digest: row?.weekly_digest ?? defaults.weekly_digest,
    product_updates: row?.product_updates ?? defaults.product_updates,
    important_updates: row?.important_updates ?? defaults.important_updates,
    web_push_permission: row?.web_push_permission ?? defaults.web_push_permission,
    mobile_push_permission: row?.mobile_push_permission ?? defaults.mobile_push_permission
  }
}
