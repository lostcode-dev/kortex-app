import { z } from 'zod'
import { getSupabaseAdminClient } from '../../../utils/supabase'
import { requireAuthUser } from '../../../utils/require-auth'

const bodySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  color: z.string().max(30).default('gray')
})

export default eventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const body = await readBody(event)
  const parsed = bodySchema.parse(body)

  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase
    .from('habit_tags')
    .insert({
      user_id: user.id,
      name: parsed.name,
      color: parsed.color
    })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      throw createError({ statusCode: 409, statusMessage: 'Tag já existe com este nome' })
    }
    throw createError({ statusCode: 500, statusMessage: 'Falha ao criar tag', data: error.message })
  }

  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    color: data.color ?? 'gray',
    createdAt: data.created_at,
    updatedAt: data.updated_at
  }
})
