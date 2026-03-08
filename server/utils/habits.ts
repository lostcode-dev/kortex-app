function mapIdentity(row: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!row) return null

  return {
    id: row.id,
    userId: row.userId ?? row.user_id,
    name: row.name,
    description: row.description ?? null,
    createdAt: row.createdAt ?? row.created_at,
    updatedAt: row.updatedAt ?? row.updated_at,
    archivedAt: row.archivedAt ?? row.archived_at ?? null
  }
}

function mapStreak(row: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!row) return null

  return {
    habitId: row.habitId ?? row.habit_id,
    userId: row.userId ?? row.user_id,
    currentStreak: row.currentStreak ?? row.current_streak,
    longestStreak: row.longestStreak ?? row.longest_streak,
    lastCompletedDate: row.lastCompletedDate ?? row.last_completed_date ?? null,
    updatedAt: row.updatedAt ?? row.updated_at
  }
}

export function mapHabit(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    userId: row.userId ?? row.user_id,
    identityId: row.identityId ?? row.identity_id ?? null,
    name: row.name,
    description: row.description ?? null,
    obviousStrategy: row.obviousStrategy ?? row.obvious_strategy ?? null,
    attractiveStrategy: row.attractiveStrategy ?? row.attractive_strategy ?? null,
    easyStrategy: row.easyStrategy ?? row.easy_strategy ?? null,
    satisfyingStrategy: row.satisfyingStrategy ?? row.satisfying_strategy ?? null,
    frequency: row.frequency,
    difficulty: row.difficulty,
    habitType: row.habitType ?? row.habit_type ?? 'positive',
    customDays: row.customDays ?? row.custom_days ?? null,
    sortOrder: row.sortOrder ?? row.sort_order ?? 0,
    timezone: row.timezone ?? null,
    scheduledTime: row.scheduledTime ?? row.scheduled_time ?? null,
    archivedAt: row.archivedAt ?? row.archived_at ?? null,
    createdAt: row.createdAt ?? row.created_at,
    updatedAt: row.updatedAt ?? row.updated_at,
    identity: mapIdentity((row.identity ?? null) as Record<string, unknown> | null),
    streak: mapStreak((row.streak ?? null) as Record<string, unknown> | null)
  }
}

/**
 * Maps a habit_versions row (with separate identity/streak/archivedAt) to the
 * same shape returned by mapHabit, so the client doesn't need to distinguish.
 */
export function mapHabitFromVersion(
  version: Record<string, unknown>,
  identity: Record<string, unknown> | null | undefined,
  streak: Record<string, unknown> | null | undefined,
  archivedAt: string | null
): Record<string, unknown> {
  return {
    id: version.habit_id,
    userId: version.user_id,
    identityId: version.identity_id ?? null,
    name: version.name,
    description: version.description ?? null,
    obviousStrategy: version.obvious_strategy ?? null,
    attractiveStrategy: version.attractive_strategy ?? null,
    easyStrategy: version.easy_strategy ?? null,
    satisfyingStrategy: version.satisfying_strategy ?? null,
    frequency: version.frequency,
    difficulty: version.difficulty,
    habitType: version.habit_type ?? 'positive',
    customDays: version.custom_days ?? null,
    sortOrder: version.sort_order ?? 0,
    timezone: version.timezone ?? null,
    scheduledTime: version.scheduled_time ?? null,
    archivedAt,
    createdAt: version.created_at,
    updatedAt: version.updated_at,
    identity: mapIdentity(identity ?? null),
    streak: mapStreak(streak ?? null)
  }
}

export function mapHabitList(rows: Record<string, unknown>[] | null | undefined): Record<string, unknown>[] {
  return (rows ?? []).map(mapHabit)
}