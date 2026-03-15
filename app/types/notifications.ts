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

export type NotificationPreferences = {
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

export type NotificationPushSubscription = {
  id: string
  provider: 'onesignal'
  deviceKey: string
  channel: NotificationPushChannel
  platform: NotificationPlatform
  appContext: NotificationAppContext
  oneSignalSubscriptionId: string | null
  permission: NotificationPermission
  optedIn: boolean
  lastSeenAt: string
}

export type NotificationSettingsResponse = NotificationPreferences & {
  subscriptions: NotificationPushSubscription[]
}

export type NotificationSubscriptionSyncPayload = {
  provider: 'onesignal'
  deviceKey: string
  channel: NotificationPushChannel
  platform: NotificationPlatform
  appContext: NotificationAppContext
  oneSignalSubscriptionId: string | null
  oneSignalUserId: string | null
  token: string | null
  permission: NotificationPermission
  optedIn: boolean
  sdkVersion: string | null
  appVersion: string | null
  deviceModel: string | null
  language: string | null
  timezone: string | null
  metadata?: Record<string, unknown>
}
