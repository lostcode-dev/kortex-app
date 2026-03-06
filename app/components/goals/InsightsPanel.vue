<script setup lang="ts">
import type { GoalInsights } from '~/types/goals'

defineProps<{
  insights: GoalInsights | null
  loading: boolean
}>()
</script>

<template>
  <div class="space-y-6">
    <!-- Loading -->
    <template v-if="loading">
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <UCard v-for="i in 4" :key="i">
          <div class="text-center space-y-2">
            <USkeleton class="h-8 w-12 mx-auto" />
            <USkeleton class="h-3 w-16 mx-auto" />
          </div>
        </UCard>
      </div>
      <UCard>
        <div class="space-y-3">
          <USkeleton class="h-4 w-32" />
          <USkeleton v-for="i in 3" :key="i" class="h-6 w-full" />
        </div>
      </UCard>
    </template>

    <template v-else-if="insights">
      <!-- Stats cards -->
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <UCard>
          <div class="text-center">
            <p class="text-2xl font-bold text-highlighted">
              {{ insights.totalGoals }}
            </p>
            <p class="text-xs text-muted">
              Total de metas
            </p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-2xl font-bold text-highlighted">
              {{ insights.activeGoals }}
            </p>
            <p class="text-xs text-muted">
              Ativas
            </p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-2xl font-bold text-success">
              {{ insights.completedGoals }}
            </p>
            <p class="text-xs text-muted">
              Concluídas
            </p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-2xl font-bold text-highlighted">
              {{ insights.averageProgress }}%
            </p>
            <p class="text-xs text-muted">
              Progresso médio
            </p>
          </div>
        </UCard>
      </div>

      <!-- By life category -->
      <UCard v-if="insights.byLifeCategory.length > 0">
        <template #header>
          <h4 class="text-sm font-medium text-highlighted">
            Por área da vida
          </h4>
        </template>

        <div class="space-y-3">
          <div v-for="cat in insights.byLifeCategory" :key="cat.category" class="space-y-1">
            <div class="flex items-center justify-between text-sm">
              <span class="text-highlighted">{{ cat.label }}</span>
              <span class="text-muted tabular-nums">
                {{ cat.count }} meta{{ cat.count !== 1 ? 's' : '' }} · {{ cat.avgProgress }}%
              </span>
            </div>
            <UProgress :model-value="Number(cat.avgProgress)" :max="100" size="xs" />
          </div>
        </div>
      </UCard>

      <!-- By time category -->
      <UCard v-if="insights.byTimeCategory.length > 0">
        <template #header>
          <h4 class="text-sm font-medium text-highlighted">
            Por prazo
          </h4>
        </template>

        <div class="space-y-3">
          <div v-for="cat in insights.byTimeCategory" :key="cat.category" class="space-y-1">
            <div class="flex items-center justify-between text-sm">
              <span class="text-highlighted">{{ cat.label }}</span>
              <span class="text-muted tabular-nums">
                {{ cat.count }} meta{{ cat.count !== 1 ? 's' : '' }} · {{ cat.avgProgress }}%
              </span>
            </div>
            <UProgress :model-value="Number(cat.avgProgress)" :max="100" size="xs" />
          </div>
        </div>
      </UCard>

      <!-- Empty insights -->
      <div v-if="insights.totalGoals === 0" class="flex flex-col items-center justify-center py-8 gap-3">
        <UIcon name="i-lucide-bar-chart-3" class="size-12 text-dimmed" />
        <p class="text-sm text-muted">
          Crie metas para ver estatísticas aqui.
        </p>
      </div>
    </template>
  </div>
</template>
