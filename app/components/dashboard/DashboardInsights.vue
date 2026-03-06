<script setup lang="ts">
import type { LifeInsights } from '~/types/life-os'

defineProps<{
  insights: LifeInsights
}>()

interface StatCard {
  label: string
  value: string | number
  icon: string
  color: string
  description: string
}
</script>

<template>
  <div class="space-y-4">
    <!-- Stats overview -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <UCard
        v-for="stat in ([
          {
            label: 'Hábitos (7d)',
            value: `${insights.habits.completionRate7d}%`,
            icon: 'i-lucide-calendar-check',
            color: 'text-success',
            description: `${insights.habits.totalActive} ativos`
          },
          {
            label: 'Tarefas (7d)',
            value: insights.tasks.completedLast7d,
            icon: 'i-lucide-check-square',
            color: 'text-primary',
            description: `${insights.tasks.pendingCount} pendentes`
          },
          {
            label: 'Metas ativas',
            value: insights.goals.totalActive,
            icon: 'i-lucide-target',
            color: 'text-warning',
            description: `${insights.goals.averageProgress}% progresso`
          },
          {
            label: 'Diário (streak)',
            value: `${insights.journal.currentStreak}d`,
            icon: 'i-lucide-book-open',
            color: 'text-info',
            description: `${insights.journal.entriesLast7d} entradas (7d)`
          }
        ] as StatCard[])"
        :key="stat.label"
        :ui="{ body: 'p-3 sm:p-4' }"
      >
        <div class="flex items-start gap-3">
          <UIcon :name="stat.icon" :class="stat.color" class="mt-0.5 size-5 shrink-0" />
          <div>
            <p class="text-lg font-bold leading-tight">
              {{ stat.value }}
            </p>
            <p class="text-xs font-medium text-highlighted">
              {{ stat.label }}
            </p>
            <p class="text-xs text-muted">
              {{ stat.description }}
            </p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Detailed insights -->
    <div class="grid gap-4 md:grid-cols-2">
      <!-- Habits detail -->
      <UCard>
        <template #header>
          <h4 class="text-sm font-semibold">
            Hábitos
          </h4>
        </template>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted">Conclusão (7 dias)</span>
            <div class="flex items-center gap-2">
              <UProgress :model-value="Number(insights.habits.completionRate7d)" :max="100" size="sm" class="w-24" />
              <span class="text-sm font-medium">{{ insights.habits.completionRate7d }}%</span>
            </div>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted">Conclusão (30 dias)</span>
            <div class="flex items-center gap-2">
              <UProgress :model-value="Number(insights.habits.completionRate30d)" :max="100" size="sm" class="w-24" />
              <span class="text-sm font-medium">{{ insights.habits.completionRate30d }}%</span>
            </div>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted">Streak médio</span>
            <span class="text-sm font-medium">{{ insights.habits.averageStreak }} dias</span>
          </div>
        </div>
      </UCard>

      <!-- Tasks detail -->
      <UCard>
        <template #header>
          <h4 class="text-sm font-semibold">
            Tarefas
          </h4>
        </template>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted">Concluídas (7 dias)</span>
            <span class="text-sm font-medium">{{ insights.tasks.completedLast7d }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted">Concluídas (30 dias)</span>
            <span class="text-sm font-medium">{{ insights.tasks.completedLast30d }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted">Pendentes</span>
            <span class="text-sm font-medium">{{ insights.tasks.pendingCount }}</span>
          </div>
          <div v-if="insights.tasks.overdueCount > 0" class="flex items-center justify-between">
            <span class="text-sm text-error">Atrasadas</span>
            <span class="text-sm font-medium text-error">{{ insights.tasks.overdueCount }}</span>
          </div>
        </div>
      </UCard>

      <!-- Goals detail -->
      <UCard>
        <template #header>
          <h4 class="text-sm font-semibold">
            Metas
          </h4>
        </template>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted">Ativas</span>
            <span class="text-sm font-medium">{{ insights.goals.totalActive }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted">Progresso médio</span>
            <div class="flex items-center gap-2">
              <UProgress :model-value="Number(insights.goals.averageProgress)" :max="100" size="sm" class="w-24" />
              <span class="text-sm font-medium">{{ insights.goals.averageProgress }}%</span>
            </div>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted">Concluídas</span>
            <span class="text-sm font-medium">{{ insights.goals.completedCount }}</span>
          </div>
        </div>
      </UCard>

      <!-- Journal detail -->
      <UCard>
        <template #header>
          <h4 class="text-sm font-semibold">
            Diário
          </h4>
        </template>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted">Entradas (7 dias)</span>
            <span class="text-sm font-medium">{{ insights.journal.entriesLast7d }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted">Entradas (30 dias)</span>
            <span class="text-sm font-medium">{{ insights.journal.entriesLast30d }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted">Streak atual</span>
            <span class="text-sm font-medium">🔥 {{ insights.journal.currentStreak }} dia{{ insights.journal.currentStreak !== 1 ? 's' : '' }}</span>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
