import { z } from 'zod'
import { getSupabaseAdminClient } from '../../utils/supabase'
import { requireAuthUser } from '../../utils/require-auth'
import { resolveHabitVersionIdForDate } from '../../utils/habit-versions'

const bodySchema = z.object({
  habitId: z.string().uuid(),
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  completed: z.boolean(),
  status: z.enum(['done', 'done_later', 'skipped']).optional(),
  note: z.string().max(500).optional()
})

export default eventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const body = await readBody(event)
  const parsedBody = bodySchema.safeParse(body)

  if (!parsedBody.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Payload inválido para registrar hábito',
      data: parsedBody.error.flatten()
    })
  }

  const parsed = parsedBody.data

  const supabase = getSupabaseAdminClient()

  // Verify habit ownership
  const { data: habit, error: habitError } = await supabase
    .from('habits')
    .select('id')
    .eq('id', parsed.habitId)
    .eq('user_id', user.id)
    .single()

  if (habitError || !habit) {
    throw createError({ statusCode: 404, statusMessage: 'Hábito não encontrado' })
  }

  const habitVersionId = await resolveHabitVersionIdForDate(supabase, parsed.habitId, user.id, parsed.logDate)

  const logStatus = parsed.status ?? (parsed.completed ? 'done' : 'skipped')
  const isCompleted = logStatus === 'done' || logStatus === 'done_later'

  // Upsert log (idempotent per habit+date)
  const { data: log, error: logError } = await supabase
    .from('habit_logs')
    .upsert(
      {
        user_id: user.id,
        habit_id: parsed.habitId,
        habit_version_id: habitVersionId,
        log_date: parsed.logDate,
        completed: isCompleted,
        status: logStatus,
        note: parsed.note ?? null,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'habit_id,log_date' }
    )
    .select('*')
    .single()

  if (logError) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao registrar hábito', data: logError.message })
  }

  // Keep the log action successful even if the cache refresh fails.
  try {
    await updateStreakCache(supabase, user.id, parsed.habitId)
  } catch (error) {
    console.error('[habits/log] streak cache update failed', {
      habitId: parsed.habitId,
      userId: user.id,
      error
    })
  }

  return log
})

async function updateStreakCache(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  userId: string,
  habitId: string
): Promise<void> {
  // Get recent logs ordered by date desc
  const { data: logs } = await supabase
    .from('habit_logs')
    .select('log_date, completed')
    .eq('habit_id', habitId)
    .eq('user_id', userId)
    .eq('completed', true)
    .order('log_date', { ascending: false })
    .limit(365)

  if (!logs || logs.length === 0) {
    await supabase.from('habit_streaks').upsert({
      habit_id: habitId,
      user_id: userId,
      current_streak: 0,
      longest_streak: 0,
      last_completed_date: null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'habit_id' })
    return
  }

  // Calculate current streak
  let currentStreak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dates = logs.map((l: Record<string, unknown>) => l.log_date as string).sort().reverse()

  for (let i = 0; i < dates.length; i++) {
    const logDate = new Date(dates[i])
    logDate.setHours(0, 0, 0, 0)

    const expectedDate = new Date(today)
    expectedDate.setDate(expectedDate.getDate() - i)
    expectedDate.setHours(0, 0, 0, 0)

    if (logDate.getTime() === expectedDate.getTime()) {
      currentStreak++
    } else if (i === 0) {
      // Allow yesterday as current streak start
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      if (logDate.getTime() === yesterday.getTime()) {
        currentStreak++
      } else {
        break
      }
    } else {
      break
    }
  }

  // Calculate longest streak
  let longestStreak = 0
  let tempStreak = 1
  const sortedDates = [...dates].sort()

  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1])
    const curr = new Date(sortedDates[i])
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)

    if (diff === 1) {
      tempStreak++
    } else {
      longestStreak = Math.max(longestStreak, tempStreak)
      tempStreak = 1
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak, currentStreak)

  await supabase.from('habit_streaks').upsert({
    habit_id: habitId,
    user_id: userId,
    current_streak: currentStreak,
    longest_streak: longestStreak,
    last_completed_date: dates[0] ?? null,
    updated_at: new Date().toISOString()
  }, { onConflict: 'habit_id' })
}
