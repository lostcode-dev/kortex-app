import { z } from 'zod'
import { getSupabaseAdminClient } from '../../../../utils/supabase'
import { requireAuthUser } from '../../../../utils/require-auth'

const bodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().max(20).optional().nullable()
})

export default eventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const id = getRouterParam(event, 'id')

  if (!id || !z.string().uuid().safeParse(id).success) {
    throw createError({ statusCode: 400, statusMessage: 'ID inválido' })
  }

  const body = await readBody(event)
  const payload = bodySchema.parse(body)

  const supabase = getSupabaseAdminClient()

  const update: Record<string, unknown> = {}
  if (payload.name !== undefined) update.name = payload.name
  if (payload.color !== undefined) update.color = payload.color

  const { data: list, error } = await supabase
    .from('idea_lists')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error || !list) {
    throw createError({ statusCode: 500, statusMessage: 'Erro ao atualizar lista', data: error?.message })
  }

  return {
    id: list.id,
    userId: list.user_id,
    name: list.name,
    color: list.color,
    createdAt: list.created_at
  }
})
