import { z } from 'zod'
import { randomBytes } from 'node:crypto'
import { getSupabaseAdminClient } from '../../utils/supabase'
import { requireAuthUser } from '../../utils/require-auth'

const bodySchema = z.object({
  reviewDay: z.number().int().min(0).max(6).optional(),
  reviewReminderEnabled: z.boolean().optional(),
  reviewReminderTime: z.string().regex(/^\d{2}:\d{2}$/, 'Horário deve estar no formato HH:mm').optional(),
  shareEnabled: z.boolean().optional()
})

export default eventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const body = await readBody(event)
  const parsed = bodySchema.parse(body)

  const supabase = getSupabaseAdminClient()

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  }

  if (parsed.reviewDay !== undefined) updateData.review_day = parsed.reviewDay
  if (parsed.reviewReminderEnabled !== undefined) updateData.review_reminder_enabled = parsed.reviewReminderEnabled
  if (parsed.reviewReminderTime !== undefined) updateData.review_reminder_time = parsed.reviewReminderTime
  if (parsed.shareEnabled !== undefined) updateData.share_enabled = parsed.shareEnabled

  // Generate share token on first enable
  if (parsed.shareEnabled === true) {
    const { data: existing } = await supabase
      .from('habit_user_settings')
      .select('share_token')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!existing?.share_token) {
      updateData.share_token = randomBytes(24).toString('base64url')
    }
  }

  const { data, error } = await supabase
    .from('habit_user_settings')
    .upsert(
      { user_id: user.id, ...updateData },
      { onConflict: 'user_id' }
    )
    .select('*')
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao salvar configurações', data: error.message })
  }

  return {
    userId: data.user_id,
    reviewDay: data.review_day,
    reviewReminderEnabled: data.review_reminder_enabled,
    reviewReminderTime: data.review_reminder_time,
    shareToken: data.share_token,
    shareEnabled: data.share_enabled,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  }
})
