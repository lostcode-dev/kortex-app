import { z } from 'zod'
import { getSupabaseAdminClient } from '../../utils/supabase'
import { requireAuthUser } from '../../utils/require-auth'
import { mapHabitStack } from '../../utils/habit-stacks'

const bodySchema = z.object({
  triggerHabitId: z.string().uuid('ID do hábito gatilho é obrigatório'),
  newHabitId: z.string().uuid('ID do hábito seguinte é obrigatório')
}).refine(
  data => data.triggerHabitId !== data.newHabitId,
  { message: 'O hábito gatilho e o seguinte devem ser diferentes', path: ['newHabitId'] }
)

export default eventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const body = await readBody(event)
  const parsed = bodySchema.parse(body)

  const supabase = getSupabaseAdminClient()

  // Verify both habits belong to the user
  const { data: habits, error: habitsError } = await supabase
    .from('habits')
    .select('id')
    .eq('user_id', user.id)
    .in('id', [parsed.triggerHabitId, parsed.newHabitId])
    .is('archived_at', null)

  if (habitsError || !habits || habits.length < 2) {
    throw createError({ statusCode: 400, statusMessage: 'Um ou ambos os hábitos não foram encontrados' })
  }

  // Check for duplicate stack
  const { data: existing } = await supabase
    .from('habit_stacks')
    .select('id')
    .eq('user_id', user.id)
    .eq('trigger_habit_id', parsed.triggerHabitId)
    .eq('new_habit_id', parsed.newHabitId)
    .is('archived_at', null)
    .maybeSingle()

  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Esse empilhamento já existe' })
  }

  const { data: existingParent } = await supabase
    .from('habit_stacks')
    .select('id')
    .eq('user_id', user.id)
    .eq('new_habit_id', parsed.newHabitId)
    .neq('trigger_habit_id', parsed.triggerHabitId)
    .is('archived_at', null)
    .maybeSingle()

  if (existingParent) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Este hábito já está empilhado abaixo de outro hábito. Remova o vínculo atual antes de mover.'
    })
  }

  const { data, error } = await supabase
    .from('habit_stacks')
    .insert({
      user_id: user.id,
      trigger_habit_id: parsed.triggerHabitId,
      new_habit_id: parsed.newHabitId
    })
    .select('*, triggerHabit:habits!trigger_habit_id(id, name), newHabit:habits!new_habit_id(id, name)')
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao criar empilhamento', data: error.message })
  }

  return mapHabitStack(data as Record<string, unknown>)
})
