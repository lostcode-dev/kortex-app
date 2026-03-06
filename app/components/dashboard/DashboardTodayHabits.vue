<script setup lang="ts">
import type { DashboardHabit } from '~/types/life-os'

defineProps<{
  habits: DashboardHabit[]
  completedCount: number
  totalCount: number
}>()
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-calendar-check" class="size-5 text-primary" />
          <h3 class="text-sm font-semibold">
            Hábitos de hoje
          </h3>
        </div>
        <UBadge
          :color="completedCount === totalCount && totalCount > 0 ? 'success' : 'neutral'"
          variant="subtle"
          size="sm"
        >
          {{ completedCount }}/{{ totalCount }}
        </UBadge>
      </div>
    </template>

    <div v-if="totalCount === 0" class="flex flex-col items-center gap-2 py-4 text-center">
      <UIcon name="i-lucide-sunrise" class="size-8 text-dimmed" />
      <p class="text-sm text-muted">
        Nenhum hábito programado para hoje
      </p>
    </div>

    <ul v-else class="divide-y divide-default">
      <li
        v-for="habit in habits"
        :key="habit.id"
        class="flex items-center justify-between py-2.5"
      >
        <div class="flex items-center gap-3">
          <UIcon
            :name="habit.completed ? 'i-lucide-check-circle-2' : 'i-lucide-circle'"
            :class="habit.completed ? 'text-success' : 'text-muted'"
            class="size-5 shrink-0"
          />
          <div>
            <p
              class="text-sm font-medium"
              :class="{ 'line-through text-muted': habit.completed }"
            >
              {{ habit.name }}
            </p>
            <p v-if="habit.streakCurrent > 0" class="text-xs text-muted">
              🔥 {{ habit.streakCurrent }} dia{{ habit.streakCurrent > 1 ? 's' : '' }}
            </p>
          </div>
        </div>
        <UBadge
          :color="habit.difficulty === 'hard' ? 'error' : habit.difficulty === 'normal' ? 'warning' : 'info'"
          variant="subtle"
          size="xs"
        >
          {{ habit.difficulty === 'hard' ? 'Difícil' : habit.difficulty === 'normal' ? 'Normal' : 'Fácil' }}
        </UBadge>
      </li>
    </ul>

    <template v-if="totalCount > 0" #footer>
      <div class="flex items-center justify-between">
        <UProgress
          :model-value="Number(completedCount)"
          :max="Number(totalCount)"
          size="sm"
          class="flex-1"
        />
        <span class="ml-3 text-xs text-muted">
          {{ totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0 }}%
        </span>
      </div>
    </template>
  </UCard>
</template>
