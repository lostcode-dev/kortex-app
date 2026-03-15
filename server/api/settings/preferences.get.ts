import { requireAuthUser } from '../../utils/require-auth'
import { getSupabaseAdminClient } from '../../utils/supabase'

export default eventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from('user_preferences')
    .select('primary_color, neutral_color, color_mode, timezone')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw createError({
      statusCode: 500,
      statusMessage: 'Não foi possível carregar as preferências'
    })
  }

  if (!data) {
    return {
      primary_color: 'emerald',
      neutral_color: 'slate',
      color_mode: 'dark',
      timezone: 'UTC'
    }
  }

  return {
    primary_color: data.primary_color,
    neutral_color: data.neutral_color,
    color_mode: data.color_mode,
    timezone: data.timezone ?? 'UTC'
  }
})
