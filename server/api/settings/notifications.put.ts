import { z } from 'zod'
import { requireAuthUser } from '../../utils/require-auth'
import { getSupabaseAdminClient } from '../../utils/supabase'
import { NOTIFICATION_PERMISSION_VALUES } from '../../utils/notification-settings'

const schema = z.object({
  channel_in_app: z.boolean(),
  channel_email: z.boolean(),
  channel_web_push: z.boolean(),
  channel_mobile_push: z.boolean(),
  habit_reminders: z.boolean(),
  weekly_digest: z.boolean(),
  product_updates: z.boolean(),
  important_updates: z.boolean(),
  web_push_permission: z.enum(NOTIFICATION_PERMISSION_VALUES).optional(),
  mobile_push_permission: z.enum(NOTIFICATION_PERMISSION_VALUES).optional()
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

  const supabase = getSupabaseAdminClient()
  const updatePayload = {
    user_id: user.id,
    channel_in_app: parsed.data.channel_in_app,
    channel_email: parsed.data.channel_email,
    channel_web_push: parsed.data.channel_web_push,
    channel_mobile_push: parsed.data.channel_mobile_push,
    habit_reminders: parsed.data.habit_reminders,
    weekly_digest: parsed.data.weekly_digest,
    product_updates: parsed.data.product_updates,
    important_updates: parsed.data.important_updates,
    ...(parsed.data.web_push_permission ? { web_push_permission: parsed.data.web_push_permission } : {}),
    ...(parsed.data.mobile_push_permission ? { mobile_push_permission: parsed.data.mobile_push_permission } : {})
  }

  const { error } = await supabase
    .from('notification_preferences')
    .upsert(updatePayload, { onConflict: 'user_id' })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Não foi possível salvar as preferências'
    })
  }

  return { ok: true }
})
