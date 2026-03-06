<script setup lang="ts">
import type { HabitInsights as InsightsType } from '~/types/habits'

const props = defineProps<{
  insights: InsightsType | null
  loading: boolean
}>()

const stats = computed(() => {
  if (!props.insights) return []
  return [
    {
      title: 'Taxa 7 dias',
      value: `${props.insights.completionRate7d}%`,
      icon: 'i-lucide-trending-up'
    },
    {
      title: 'Taxa 30 dias',
      value: `${props.insights.completionRate30d}%`,
      icon: 'i-lucide-bar-chart-3'
    },
    {
      title: 'Streak médio',
      value: `${props.insights.averageStreak}d`,
      icon: 'i-lucide-flame'
    },
    {
      title: 'Melhor dia',
      value: props.insights.bestDay ?? '—',
      icon: 'i-lucide-calendar-check'
    }
  ]
})
</script>

<template>
  <div class="space-y-6">
    <!-- Stat cards -->
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <template v-if="loading">
        <UCard v-for="i in 4" :key="i">
          <div class="space-y-2">
            <USkeleton class="h-4 w-20" />
            <USkeleton class="h-8 w-16" />
          </div>
        </UCard>
      </template>

      <template v-else>
        <UCard v-for="stat in stats" :key="stat.title">
          <div class="flex items-start gap-3">
            <UIcon :name="stat.icon" class="size-5 text-primary mt-0.5" />
            <div>
              <p class="text-xs text-muted">
                {{ stat.title }}
              </p>
              <p class="text-xl font-semibold text-highlighted">
                {{ stat.value }}
              </p>
            </div>
          </div>
        </UCard>
      </template>
    </div>

    <!-- Identity Progress -->
    <UCard v-if="!loading && insights?.identityProgress?.length">
      <template #header>
        <p class="font-medium text-highlighted">
          Progresso por identidade
        </p>
      </template>

      <div class="space-y-4">
        <div
          v-for="ip in insights.identityProgress"
          :key="ip.identity.id"
          class="space-y-1"
        >
          <div class="flex items-center justify-between text-sm">
            <span class="text-highlighted">{{ ip.identity.name }}</span>
            <span class="text-muted">{{ ip.score }}% · {{ ip.totalHabits }} hábitos</span>
          </div>
          <UProgress :model-value="Number(ip.score)" :max="100" size="sm" />
        </div>
      </div>
    </UCard>

    <!-- Empty state -->
    <div v-if="!loading && !insights?.identityProgress?.length && stats.length === 0" class="flex flex-col items-center gap-4 py-12">
      <UIcon name="i-lucide-bar-chart-3" class="size-12 text-dimmed" />
      <div class="text-center">
        <p class="font-medium text-highlighted">
          Sem dados suficientes
        </p>
        <p class="text-sm text-muted">
          Complete seus hábitos para ver seus insights aqui.
        </p>
      </div>
    </div>
  </div>
</template>
