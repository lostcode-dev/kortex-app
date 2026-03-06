import { z } from 'zod'
import { getSupabaseAdminClient } from '../../../utils/supabase'
import { requireAuthUser } from '../../../utils/require-auth'

const bodySchema = z.object({
  title: z.string().min(1, { message: 'Título é obrigatório' }).max(500),
  description: z.string().max(10000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'done', 'archived']).default('backlog'),
  listId: z.string().uuid().optional(),
  dueDate: z.string().optional(),
  tagIds: z.array(z.string().uuid()).optional()
})

export default eventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const body = await readBody(event)
  const payload = bodySchema.parse(body)

  const supabase = getSupabaseAdminClient()

  const { data: idea, error } = await supabase
    .from('ideas')
    .insert({
      user_id: user.id,
      title: payload.title,
      description: payload.description ?? null,
      priority: payload.priority ?? null,
      status: payload.status,
      list_id: payload.listId ?? null,
      due_date: payload.dueDate ?? null
    })
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Erro ao criar ideia', data: error.message })
  }

  // Attach tags
  if (payload.tagIds && payload.tagIds.length > 0) {
    const tagLinks = payload.tagIds.map(tagId => ({
      idea_id: idea.id,
      tag_id: tagId
    }))
    await supabase.from('idea_tag_links').insert(tagLinks)
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
