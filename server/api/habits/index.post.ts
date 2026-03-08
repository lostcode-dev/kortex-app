import { z } from 'zod'
import { getSupabaseAdminClient } from '../../utils/supabase'
import { requireAuthUser } from '../../utils/require-auth'
import { sanitizeRichTextHtml } from '../../utils/rich-text'
import { mapHabit } from '../../utils/habits'
import { createInitialHabitVersion } from '../../utils/habit-versions'

const bodySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  description: z.string().max(5000).optional(),
  obviousStrategy: z.string().max(5000).optional(),
  attractiveStrategy: z.string().max(5000).optional(),
  easyStrategy: z.string().max(5000).optional(),
  satisfyingStrategy: z.string().max(5000).optional(),
  frequency: z.enum(['daily', 'weekly', 'custom']).default('daily'),
  difficulty: z.enum(['tiny', 'normal', 'hard']).default('normal'),
  habitType: z.enum(['positive', 'negative']).default('positive'),
  identityId: z.string().uuid().optional(),
  customDays: z.array(z.number().int().min(0).max(6)).optional(),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/, 'Horário deve estar no formato HH:mm').optional()
}).refine(
  data => data.frequency !== 'custom' || (data.customDays && data.customDays.length > 0),
  { message: 'Selecione ao menos um dia para frequência personalizada', path: ['customDays'] }
)

export default eventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const body = await readBody(event)
  const parsed = bodySchema.parse(body)

  const supabase = getSupabaseAdminClient()

  // Create the habit
  const { data: habit, error } = await supabase
    .from('habits')
    .insert({
      user_id: user.id,
      name: parsed.name,
      description: sanitizeRichTextHtml(parsed.description),
      obvious_strategy: sanitizeRichTextHtml(parsed.obviousStrategy),
      attractive_strategy: sanitizeRichTextHtml(parsed.attractiveStrategy),
      easy_strategy: sanitizeRichTextHtml(parsed.easyStrategy),
      satisfying_strategy: sanitizeRichTextHtml(parsed.satisfyingStrategy),
      frequency: parsed.frequency,
      difficulty: parsed.difficulty,
      habit_type: parsed.habitType,
      identity_id: parsed.identityId ?? null,
      custom_days: parsed.customDays ?? null,
      scheduled_time: parsed.scheduledTime ?? null
    })
    .select('*')
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao criar hábito', data: error.message })
  }

  await createInitialHabitVersion(supabase, habit as Record<string, unknown>)

  // Initialize streak cache
  await supabase.from('habit_streaks').insert({
    habit_id: habit.id,
    user_id: user.id,
    current_streak: 0,
    longest_streak: 0,
    last_completed_date: null
  })

  return mapHabit(habit as Record<string, unknown>)
})
