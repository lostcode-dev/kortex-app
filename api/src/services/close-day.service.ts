import { HabitRepository } from '../repositories/index.js'
import { env } from '../config/index.js'
import { HabitFrequency, HabitLogStatus } from '../types/index.js'
import type { SkipLogInsert } from '../types/index.js'
import { getUtcDayOfWeek, listDatesBetween, getTodayLocal, getPreviousDateUtc, logger } from '../utils/index.js'
import { getSupabaseClient } from '../lib/index.js'

export interface CloseDayResult {
  skipped: number
  processedDates: string[]
  range: { from: string; to: string }
}

/**
 * Default number of days to look back for backfill when no `from` is provided.
 * Covers weekends + possible downtime.
 */
const BACKFILL_DAYS = 7
const DEFAULT_FETCH_BATCH_SIZE = env.CLOSE_DAY_FETCH_BATCH_SIZE
const DEFAULT_UPSERT_BATCH_SIZE = env.CLOSE_DAY_UPSERT_BATCH_SIZE

export class CloseDayService {
  private repo: HabitRepository

  constructor() {
    this.repo = new HabitRepository(getSupabaseClient())
  }

  /**
   * Processes habit close-day for a date range.
   *
   * When called without parameters (the normal cron path):
   * - `endDate` = yesterday (based on configured timezone)
   * - `startDate` = endDate - BACKFILL_DAYS (to catch any missed days)
   *
   * The operation is idempotent: existing logs are never overwritten
   * thanks to the UNIQUE(habit_id, log_date) constraint + upsert with onConflict.
   */
  async execute(dateParam?: string, fromParam?: string): Promise<CloseDayResult> {
    const today = getTodayLocal()
    const endDate = dateParam ?? getPreviousDateUtc(today)

    if (endDate >= today) {
      throw Object.assign(new Error('A rotina de fechamento só pode processar datas anteriores a hoje'), {
        statusCode: 400,
      })
    }

    const defaultFrom = (() => {
      const d = new Date(`${endDate}T12:00:00Z`)
      d.setUTCDate(d.getUTCDate() - (BACKFILL_DAYS - 1))
      return d.toISOString().split('T')[0] as string
    })()

    const startDate = fromParam ?? defaultFrom

    if (startDate > endDate) {
      throw Object.assign(new Error('O parâmetro from deve ser menor ou igual a date'), { statusCode: 400 })
    }

    const processedDates = listDatesBetween(startDate, endDate)
    let skipped = 0

    for (const targetDate of processedDates) {
      skipped += await this.processDate(targetDate)
    }

    logger.info('[close-day] concluído', { skipped, range: { from: startDate, to: endDate } })

    return { skipped, processedDates, range: { from: startDate, to: endDate } }
  }

  private async processDate(targetDate: string): Promise<number> {
    const dayOfWeek = getUtcDayOfWeek(targetDate)

    let skipped = 0
    let start = 0

    while (true) {
      const versions = await this.repo.getVersionsForDate(targetDate, start, DEFAULT_FETCH_BATCH_SIZE)
      if (versions.length === 0) break

      skipped += await this.processVersionBatch(targetDate, dayOfWeek, versions)

      if (versions.length < DEFAULT_FETCH_BATCH_SIZE) break
      start += DEFAULT_FETCH_BATCH_SIZE
    }

    return skipped
  }

  private async processVersionBatch(targetDate: string, dayOfWeek: number, versions: Array<{
    id: string
    habit_id: string
    user_id: string
    frequency: HabitFrequency
    custom_days: number[] | null
  }>): Promise<number> {
    const habitIds = [...new Set(versions.map((v) => v.habit_id))]
    const habits = await this.repo.getHabitsByIds(habitIds)
    const archivedMap = new Map(habits.map((h) => [h.id, h.archived_at]))

    const dueVersions = versions.filter((version) => {
      const archivedAt = archivedMap.get(version.habit_id)
      if (archivedAt) {
        const archivedDate = archivedAt.split('T')[0]
        if (archivedDate && archivedDate <= targetDate) return false
      }

      return isDueOnDay(version.frequency, version.custom_days, dayOfWeek)
    })

    if (dueVersions.length === 0) return 0

    const dueHabitIds = dueVersions.map((version) => version.habit_id)
    const existingLogs = await this.getLogsForDateInChunks(dueHabitIds, targetDate)
    const loggedIds = new Set(existingLogs.map((log) => log.habit_id))

    const rows: SkipLogInsert[] = dueVersions
      .filter((version) => !loggedIds.has(version.habit_id))
      .map((version) => ({
        user_id: version.user_id,
        habit_id: version.habit_id,
        habit_version_id: version.id,
        log_date: targetDate,
        completed: false as const,
        status: HabitLogStatus.Skipped,
        note: null,
        updated_at: new Date().toISOString(),
      }))

    if (rows.length === 0) return 0

    await this.upsertSkipLogsInChunks(rows)
    return rows.length
  }

  private async getLogsForDateInChunks(habitIds: string[], targetDate: string) {
    const logRows = []

    for (const habitIdChunk of chunkArray(habitIds, DEFAULT_FETCH_BATCH_SIZE)) {
      const chunkLogs = await this.repo.getLogsForDate(habitIdChunk, targetDate)
      logRows.push(...chunkLogs)
    }

    return logRows
  }

  private async upsertSkipLogsInChunks(rows: SkipLogInsert[]): Promise<void> {
    for (const rowChunk of chunkArray(rows, DEFAULT_UPSERT_BATCH_SIZE)) {
      await this.repo.upsertSkipLogs(rowChunk)
    }
  }
}

function isDueOnDay(frequency: HabitFrequency | string, customDays: number[] | null, dayOfWeek: number): boolean {
  if (frequency === HabitFrequency.Daily) return true
  if (frequency === HabitFrequency.Weekly) return dayOfWeek === 1
  if (frequency === HabitFrequency.Custom) {
    return customDays?.includes(dayOfWeek) ?? false
  }
  return false
}

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = []

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize))
  }

  return chunks
}
