import { z } from 'zod'
import { getSupabaseAdminClient } from '../../../utils/supabase'
import { requireAuthUser } from '../../../utils/require-auth'

const paramsSchema = z.object({
  id: z.string().uuid()
})

export default eventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const { id } = paramsSchema.parse(getRouterParams(event))

  const supabase = getSupabaseAdminClient()

  const { error } = await supabase
    .from('habit_stacks')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .is('archived_at', null)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao remover empilhamento', data: error.message })
  }

  return { success: true }
})
