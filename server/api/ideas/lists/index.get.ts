import { getSupabaseAdminClient } from '../../../../utils/supabase'
import { requireAuthUser } from '../../../../utils/require-auth'

export default eventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const supabase = getSupabaseAdminClient()

  const { data: lists, error } = await supabase
    .from('idea_lists')
    .select('*')
    .eq('user_id', user.id)
    .order('name', { ascending: true })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Erro ao buscar listas', data: error.message })
  }

  // Count ideas per list
  const listIds = (lists ?? []).map(l => l.id)
  let countMap: Record<string, number> = {}
  if (listIds.length > 0) {
    const { data: ideas } = await supabase
      .from('ideas')
      .select('list_id')
      .eq('user_id', user.id)
      .in('list_id', listIds)

    for (const i of ideas ?? []) {
      if (i.list_id) countMap[i.list_id] = (countMap[i.list_id] ?? 0) + 1
    }
  }

  return (lists ?? []).map(l => ({
    id: l.id,
    userId: l.user_id,
    name: l.name,
    color: l.color,
    createdAt: l.created_at,
    ideaCount: countMap[l.id] ?? 0
  }))
})
