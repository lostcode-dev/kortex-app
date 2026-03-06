import { z } from 'zod'
import { getSupabaseAdminClient } from '../../../../utils/supabase'
import { requireAuthUser } from '../../../../utils/require-auth'

const bodySchema = z.object({
  title: z.string().min(1).max(500).optional(),
  completed: z.boolean().optional(),
  position: z.number().int().min(0).optional()
})

export default eventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const subtaskId = getRouterParam(event, 'subtaskId')

  if (!subtaskId || !z.string().uuid().safeParse(subtaskId).success) {
    throw createError({ statusCode: 400, statusMessage: 'ID inválido' })
  }

  const supabase = getSupabaseAdminClient()

  // Verify ownership via idea
  const { data: subtask } = await supabase
    .from('idea_subtasks')
    .select('id, idea_id')
    .eq('id', subtaskId)
    .single()

  if (!subtask) {
    throw createError({ statusCode: 404, statusMessage: 'Subtarefa não encontrada' })
  }

  const { data: idea } = await supabase
    .from('ideas')
    .select('id')
    .eq('id', subtask.idea_id)
    .eq('user_id', user.id)
    .single()

  if (!idea) {
    throw createError({ statusCode: 403, statusMessage: 'Sem permissão' })
  }

  const body = await readBody(event)
  const payload = bodySchema.parse(body)

  const update: Record<string, unknown> = {}
  if (payload.title !== undefined) update.title = payload.title
  if (payload.completed !== undefined) update.completed = payload.completed
  if (payload.position !== undefined) update.position = payload.position

  const { data: updated, error } = await supabase
    .from('idea_subtasks')
    .update(update)
    .eq('id', subtaskId)
    .select()
    .single()

  if (error || !updated) {
    throw createError({ statusCode: 500, statusMessage: 'Erro ao atualizar subtarefa', data: error?.message })
  }

  return {
    id: updated.id,
    ideaId: updated.idea_id,
    title: updated.title,
    completed: updated.completed,
    position: updated.position,
    createdAt: updated.created_at
  }
})
