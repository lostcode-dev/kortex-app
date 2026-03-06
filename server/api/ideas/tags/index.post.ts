import { z } from 'zod'
import { getSupabaseAdminClient } from '../../../../utils/supabase'
import { requireAuthUser } from '../../../../utils/require-auth'

const bodySchema = z.object({
  name: z.string().min(1, { message: 'Nome é obrigatório' }).max(100)
})

export default eventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const body = await readBody(event)
  const payload = bodySchema.parse(body)

  const supabase = getSupabaseAdminClient()

  const { data: tag, error } = await supabase
    .from('idea_tags')
    .insert({
      user_id: user.id,
      name: payload.name
    })
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Erro ao criar tag', data: error.message })
  }

  return {
    id: tag.id,
    userId: tag.user_id,
    name: tag.name,
    createdAt: tag.created_at
  }
})
