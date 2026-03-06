import { z } from 'zod'
import { getSupabaseAdminClient } from '../../../utils/supabase'
import { requireAuthUser } from '../../../utils/require-auth'

const bodySchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional().nullable(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'done', 'archived']).optional(),
  listId: z.string().uuid().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  tagIds: z.array(z.string().uuid()).optional()
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

  // Build update object
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (payload.title !== undefined) update.title = payload.title
  if (payload.description !== undefined) update.description = payload.description
  if (payload.priority !== undefined) update.priority = payload.priority
  if (payload.status !== undefined) update.status = payload.status
  if (payload.listId !== undefined) update.list_id = payload.listId
  if (payload.dueDate !== undefined) update.due_date = payload.dueDate

  const { data: idea, error } = await supabase
    .from('ideas')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error || !idea) {
    throw createError({ statusCode: 500, statusMessage: 'Erro ao atualizar ideia', data: error?.message })
  }

  // Sync tags if provided
  if (payload.tagIds !== undefined) {
    await supabase.from('idea_tag_links').delete().eq('idea_id', id)
    if (payload.tagIds.length > 0) {
      const tagLinks = payload.tagIds.map(tagId => ({
        idea_id: id,
        tag_id: tagId
      }))
      await supabase.from('idea_tag_links').insert(tagLinks)
    }
  }

  return {
    id: idea.id,
    userId: idea.user_id,
    listId: idea.list_id,
    title: idea.title,
    description: idea.description,
    priority: idea.priority,
    status: idea.status,
    dueDate: idea.due_date,
    createdAt: idea.created_at,
    updatedAt: idea.updated_at
  }
})
