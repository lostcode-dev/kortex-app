import { z } from 'zod'
import { getSupabaseAdminClient } from '../../../utils/supabase'
import { requireAuthUser } from '../../../utils/require-auth'

export default eventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const id = getRouterParam(event, 'id')

  if (!id || !z.string().uuid().safeParse(id).success) {
    throw createError({ statusCode: 400, statusMessage: 'ID inválido' })
  }

  const supabase = getSupabaseAdminClient()

  // Fetch idea
  const { data: idea, error } = await supabase
    .from('ideas')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !idea) {
    throw createError({ statusCode: 404, statusMessage: 'Ideia não encontrada' })
  }

  // Fetch tags
  const { data: tagLinks } = await supabase
    .from('idea_tag_links')
    .select('tag_id, idea_tags(id, name)')
    .eq('idea_id', id)

  // Fetch subtasks
  const { data: subtasks } = await supabase
    .from('idea_subtasks')
    .select('*')
    .eq('idea_id', id)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })

  // Fetch list
  let list = null
  if (idea.list_id) {
    const { data: listData } = await supabase
      .from('idea_lists')
      .select('id, name, color')
      .eq('id', idea.list_id)
      .single()
    list = listData
  }

  const tags = (tagLinks ?? []).map(l => l.idea_tags as unknown as { id: string, name: string }).filter(Boolean)

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
    updatedAt: idea.updated_at,
    list,
    tags,
    subtasks: (subtasks ?? []).map(s => ({
      id: s.id,
      ideaId: s.idea_id,
      title: s.title,
      completed: s.completed,
      position: s.position,
      createdAt: s.created_at
    }))
  }
})
