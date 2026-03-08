import { z } from 'zod'
import { getSupabaseAdminClient } from '../../utils/supabase'
import { requireAuthUser } from '../../utils/require-auth'
import { mapHabit } from '../../utils/habits'

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD').optional()
})

export default eventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const query = getQuery(event)
  const params = querySchema.parse(query)

  const today = params.date ?? new Date().toISOString().split('T')[0]
  const dayOfWeek = new Date(`${today}T12:00:00Z`).getUTCDay() // 0=Sun..6=Sat

  const supabase = getSupabaseAdminClient()

  // Fetch all active habits
  const { data: habits, error: habitsError } = await supabase
    .from('habits')
    .select('*, identity:identities(*), streak:habit_streaks(*)')
    .eq('user_id', user.id)
    .is('archived_at', null)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (habitsError) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao buscar hábitos', data: habitsError.message })
  }

  // Filter habits due today
  const todayHabits = (habits ?? []).filter((habit: Record<string, unknown>) => {
    if (habit.frequency === 'daily') return true
    if (habit.frequency === 'weekly') return dayOfWeek === 1 // Monday
    if (habit.frequency === 'custom' && habit.custom_days) {
      return (habit.custom_days as number[]).includes(dayOfWeek)
    }
    return false
  })

  // Fetch logs for today
  const habitIds = todayHabits.map((h: Record<string, unknown>) => h.id as string)

  let logs: Record<string, { completed: boolean, note: string | null, id: string }> = {}

  if (habitIds.length > 0) {
    const { data: logsData } = await supabase
      .from('habit_logs')
      .select('id, habit_id, completed, note')
      .eq('user_id', user.id)
      .eq('log_date', today!)
      .in('habit_id', habitIds as string[])

    if (logsData) {
      logs = Object.fromEntries(
        logsData.map((l: Record<string, unknown>) => [l.habit_id, { completed: l.completed as boolean, note: l.note as string | null, id: l.id as string }])
      )
    }
  }

  const result = todayHabits.map((habit: Record<string, unknown>) => ({
    ...mapHabit(habit),
    log: logs[habit.id as string] ?? null
  }))

  const completedCount = result.filter((h: Record<string, unknown>) => (h.log as Record<string, unknown> | null)?.completed).length

  return {
    habits: result,
    completedCount,
    totalCount: result.length
  }
})
