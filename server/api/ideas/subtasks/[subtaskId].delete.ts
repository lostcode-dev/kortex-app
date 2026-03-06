import { z } from 'zod'
import { getSupabaseAdminClient } from '../../../../utils/supabase'
import { requireAuthUser } from '../../../../utils/require-auth'

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

  const { error } = await supabase
    .from('idea_subtasks')
    .delete()
    .eq('id', subtaskId)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Erro ao excluir subtarefa', data: error.message })
  }

  return { success: true }
})
