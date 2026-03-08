import { getSupabaseAdminClient } from '../../utils/supabase'
import { requireAuthUser } from '../../utils/require-auth'

export default eventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from('habit_user_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao buscar configurações de hábitos', data: error.message })
  }

  if (!data) {
    return {
      userId: user.id,
      reviewDay: 0,
      reviewReminderEnabled: false,
      reviewReminderTime: '09:00',
      shareToken: null,
      shareEnabled: false,
      createdAt: null,
      updatedAt: null
    }
  }

  return {
    userId: data.user_id,
    reviewDay: data.review_day,
    reviewReminderEnabled: data.review_reminder_enabled,
    reviewReminderTime: data.review_reminder_time,
    shareToken: data.share_token,
    shareEnabled: data.share_enabled,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  }
})
