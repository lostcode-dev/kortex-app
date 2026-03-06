import { z } from 'zod'
import { getSupabaseAdminClient } from '../../../../utils/supabase'
import { requireAuthUser } from '../../../../utils/require-auth'

const bodySchema = z.object({
  title: z.string().min(1, { message: 'Título é obrigatório' }).max(500)
})

export default eventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const ideaId = getRouterParam(event, 'id')

  if (!ideaId || !z.string().uuid().safeParse(ideaId).success) {
    throw createError({ statusCode: 400, statusMessage: 'ID inválido' })
  }

  // Verify ownership
  const supabase = getSupabaseAdminClient()
  const { data: idea } = await supabase
    .from('ideas')
    .select('id')
    .eq('id', ideaId)
    .eq('user_id', user.id)
    .single()

  if (!idea) {
    throw createError({ statusCode: 404, statusMessage: 'Ideia não encontrada' })
  }

  const body = await readBody(event)
  const payload = bodySchema.parse(body)

  // Get max position
  const { data: existing } = await supabase
    .from('idea_subtasks')
    .select('position')
    .eq('idea_id', ideaId)
    .order('position', { ascending: false })
    .limit(1)

  const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0

  const { data: subtask, error } = await supabase
    .from('idea_subtasks')
    .insert({
      idea_id: ideaId,
      title: payload.title,
      position: nextPosition
    })
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Erro ao criar subtarefa', data: error.message })
  }

  return {
    id: subtask.id,
    ideaId: subtask.idea_id,
    title: subtask.title,
    completed: subtask.completed,
    position: subtask.position,
    createdAt: subtask.created_at
  }
})
