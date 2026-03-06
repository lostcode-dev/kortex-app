import { z } from 'zod'
import { getSupabaseAdminClient } from '../../../utils/supabase'
import { requireAuthUser } from '../../../utils/require-auth'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'done', 'archived']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  listId: z.string().uuid().optional(),
  tagId: z.string().uuid().optional(),
  sort: z.enum(['created_at', 'updated_at', 'due_date', 'priority', 'title']).default('updated_at'),
  order: z.enum(['asc', 'desc']).default('desc')
})

export default eventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const query = getQuery(event)
  const params = querySchema.parse(query)

  const supabase = getSupabaseAdminClient()
  const offset = (params.page - 1) * params.pageSize

  // Build query
  let q = supabase
    .from('ideas')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)

  if (params.search) {
    q = q.ilike('title', `%${params.search}%`)
  }
  if (params.status) {
    q = q.eq('status', params.status)
  }
  if (params.priority) {
    q = q.eq('priority', params.priority)
  }
  if (params.listId) {
    q = q.eq('list_id', params.listId)
  }

  q = q.order(params.sort, { ascending: params.order === 'asc' })
    .range(offset, offset + params.pageSize - 1)

  const { data: ideas, count, error } = await q

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Erro ao buscar ideias', data: error.message })
  }

  const ideaIds = (ideas ?? []).map(i => i.id)

  if (ideaIds.length === 0) {
    return { data: [], total: count ?? 0, page: params.page, pageSize: params.pageSize }
  }

  // Fetch tags
  const { data: tagLinks } = await supabase
    .from('idea_tag_links')
    .select('idea_id, tag_id, idea_tags(id, name)')
    .in('idea_id', ideaIds)

  // Fetch subtask counts
  const { data: subtasks } = await supabase
    .from('idea_subtasks')
    .select('idea_id, completed')
    .in('idea_id', ideaIds)

  // Fetch lists
  const listIds = [...new Set((ideas ?? []).map(i => i.list_id).filter(Boolean))]
  let listsMap: Record<string, { id: string, name: string, color: string | null }> = {}
  if (listIds.length > 0) {
    const { data: lists } = await supabase
      .from('idea_lists')
      .select('id, name, color')
      .in('id', listIds)
    if (lists) {
      listsMap = Object.fromEntries(lists.map(l => [l.id, l]))
    }
  }

  // Build tag map
  const tagMap: Record<string, { id: string, name: string }[]> = {}
  for (const link of tagLinks ?? []) {
    const ideaId = link.idea_id
    if (!tagMap[ideaId]) tagMap[ideaId] = []
    const tag = link.idea_tags as unknown as { id: string, name: string }
    if (tag) tagMap[ideaId].push(tag)
  }

  // Build subtask counts
  const subtaskCountMap: Record<string, number> = {}
  const subtaskDoneMap: Record<string, number> = {}
  for (const st of subtasks ?? []) {
    subtaskCountMap[st.idea_id] = (subtaskCountMap[st.idea_id] ?? 0) + 1
    if (st.completed) subtaskDoneMap[st.idea_id] = (subtaskDoneMap[st.idea_id] ?? 0) + 1
  }

  // Filter by tag if needed
  let filteredIdeas = ideas ?? []
  if (params.tagId) {
    const idsWithTag = new Set(
      (tagLinks ?? []).filter(l => l.tag_id === params.tagId).map(l => l.idea_id)
    )
    filteredIdeas = filteredIdeas.filter(i => idsWithTag.has(i.id))
  }

  const data = filteredIdeas.map(i => ({
    id: i.id,
    userId: i.user_id,
    listId: i.list_id,
    title: i.title,
    description: i.description,
    priority: i.priority,
    status: i.status,
    dueDate: i.due_date,
    createdAt: i.created_at,
    updatedAt: i.updated_at,
    list: i.list_id ? listsMap[i.list_id] ?? null : null,
    tags: tagMap[i.id] ?? [],
    subtaskCount: subtaskCountMap[i.id] ?? 0,
    subtaskDoneCount: subtaskDoneMap[i.id] ?? 0
  }))

  return { data, total: count ?? 0, page: params.page, pageSize: params.pageSize }
})
