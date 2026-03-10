import { getSupabaseAdminClient } from '../../../utils/supabase'
import { requireAuthUser } from '../../../utils/require-auth'

export default eventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from('habit_tags')
    .select('*')
    .eq('user_id', user.id)
    .order('name')

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao buscar tags', data: error.message })
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    color: row.color ?? 'gray',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }))
})
