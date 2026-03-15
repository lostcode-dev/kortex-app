export enum GuidedTourKey {
  HabitsOverview = 'habits-overview',
  HabitsFirstHabitEntry = 'habits-first-habit-entry',
  HabitsFirstHabitCreate = 'habits-first-habit-create'
}

export interface GuidedTourEntry {
  completed: boolean
  completedAt: string | null
}

export type GuidedTourRegistry = Record<string, GuidedTourEntry>

export interface GuidedToursResponse {
  tours: GuidedTourRegistry
}
