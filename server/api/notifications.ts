import { z } from 'zod'
import { getQuery } from 'h3'
import { getSupabaseAdminClient } from '../utils/supabase'
import { requireAuthUser } from '../utils/require-auth'

const limitSchema = z.coerce.number().int().positive().max(100)
const unreadOnlySchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true
    if (['false', '0', 'no', 'off'].includes(normalized)) return false
  }

  return undefined
}, z.boolean().optional())

type NotificationRow = {
  id: number
  type: 'user' | 'system'
  sender_name: string | null
  sender_email: string | null
  sender_avatar_url: string | null
  body: string
  link_path: string | null
  channels: string[]
  category: string
  source: string
  read_at: string | null
  created_at: string
}

function getSingleQueryValue(value: unknown) {
  return Array.isArray(value) ? value[0] : value
}

export default eventHandler(async (event) => {
  const user = await requireAuthUser(event)

  const query = getQuery(event)
  const rawLimit = getSingleQueryValue(query.limit)
  const rawUnreadOnly = getSingleQueryValue(query.unreadOnly)

  const limitResult = limitSchema.safeParse(rawLimit)
  const limit = limitResult.success ? limitResult.data : 25

  const unreadOnlyResult = unreadOnlySchema.safeParse(rawUnreadOnly)
  const unreadOnly = unreadOnlyResult.success ? unreadOnlyResult.data : undefined

  const supabase = getSupabaseAdminClient()
  let builder = supabase
    .from('notifications')
    .select('id,type,sender_name,sender_email,sender_avatar_url,body,link_path,channels,category,source,read_at,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (unreadOnly)
    builder = builder.is('read_at', null)

  const { data, error } = await builder.returns<NotificationRow[]>()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load notifications'
    })
  }

  return (data ?? []).map(row => ({
    id: row.id,
    type: row.type,
    unread: !row.read_at,
    body: row.body,
    date: row.created_at,
    linkPath: row.link_path,
    channels: row.channels ?? ['in_app'],
    category: row.category,
    source: row.source,
    sender: {
      id: 0,
      name: row.sender_name || 'Kortex',
      email: row.sender_email || '',
      avatar: row.sender_avatar_url ? { src: row.sender_avatar_url } : undefined,
      status: 'subscribed',
      location: ''
    }
  }))
})
