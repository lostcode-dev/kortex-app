import { z } from 'zod'
import { getSupabaseAdminClient } from '../../../../utils/supabase'
import { requireAuthUser } from '../../../../utils/require-auth'

const bodySchema = z.object({
  name: z.string().min(1, { message: 'Nome é obrigatório' }).max(100),
  color: z.string().max(20).optional()
})

export default eventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const body = await readBody(event)
  const payload = bodySchema.parse(body)

  const supabase = getSupabaseAdminClient()

  const { data: list, error } = await supabase
    .from('idea_lists')
    .insert({
      user_id: user.id,
      name: payload.name,
      color: payload.color ?? null
    })
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Erro ao criar lista', data: error.message })
  }

  return {
    id: list.id,
    userId: list.user_id,
    name: list.name,
    color: list.color,
    createdAt: list.created_at,
    ideaCount: 0
  }
})
