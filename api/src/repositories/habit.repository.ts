import type { SupabaseClient } from '@supabase/supabase-js'
import type { HabitVersion, HabitRow, HabitLogRow, SkipLogInsert } from '../types/index.js'

export class HabitRepository {
  constructor(private supabase: SupabaseClient) {}

  async getVersionsForDate(targetDate: string, start = 0, batchSize = 500): Promise<HabitVersion[]> {
    const { data, error } = await this.supabase
      .from('habit_versions')
      .select('id, habit_id, user_id, frequency, custom_days, valid_from, valid_to')
      .lte('valid_from', targetDate)
      .or(`valid_to.is.null,valid_to.gte.${targetDate}`)
      .order('id', { ascending: true })
      .range(start, start + batchSize - 1)

    if (error) throw new RepositoryError('Falha ao buscar versões dos hábitos', error.message)
    return (data ?? []) as HabitVersion[]
  }

  async getHabitsByIds(habitIds: string[]): Promise<HabitRow[]> {
    const { data, error } = await this.supabase.from('habits').select('id, archived_at').in('id', habitIds)

    if (error) throw new RepositoryError('Falha ao buscar hábitos', error.message)
    return (data ?? []) as HabitRow[]
  }

  async getLogsForDate(habitIds: string[], targetDate: string): Promise<HabitLogRow[]> {
    const { data, error } = await this.supabase
      .from('habit_logs')
      .select('habit_id')
      .in('habit_id', habitIds)
      .eq('log_date', targetDate)

    if (error) throw new RepositoryError('Falha ao buscar logs dos hábitos', error.message)
    return (data ?? []) as HabitLogRow[]
  }

  async upsertSkipLogs(rows: SkipLogInsert[]): Promise<void> {
    const { error } = await this.supabase.from('habit_logs').upsert(rows, { onConflict: 'habit_id,log_date' })

    if (error) throw new RepositoryError('Falha ao inserir logs de skip', error.message)
  }
}

class RepositoryError extends Error {
  statusCode = 500
  data: unknown

  constructor(message: string, data?: unknown) {
    super(message)
    this.name = 'RepositoryError'
    this.data = data
  }
}
