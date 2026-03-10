import { z } from 'zod'
import { getSupabaseAdminClient } from '../../utils/supabase'
import { requireAuthUser } from '../../utils/require-auth'
import { mapHabit, fetchHabitTagMap } from '../../utils/habits'

const paramsSchema = z.object({
  id: z.string().uuid()
})

export default eventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const { id } = paramsSchema.parse(getRouterParams(event))

  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from('habits')
    .select('*, identity:identities(*), streak:habit_streaks(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) {
    throw createError({ statusCode: 404, statusMessage: 'Hábito não encontrado' })
  }

  const tagMap = await fetchHabitTagMap(supabase, [id])

  return mapHabit(data as Record<string, unknown>, tagMap.get(id))
})
