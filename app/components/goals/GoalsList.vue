<script setup lang="ts">
import type { Goal } from '~/types/goals'
import { GoalStatus } from '~/types/goals'

const _props = defineProps<{
  goals: Goal[]
  total: number
  page: number
  pageSize: number
  loading: boolean
}>()

const emit = defineEmits<{
  'update:page': [value: number]
  'select': [goalId: string]
  'edit': [goal: Goal]
  'archive': [goal: Goal]
  'complete': [goal: Goal]
  'restore': [goal: Goal]
}>()

const { getLifeCategoryLabel, getTimeCategoryLabel, getStatusColor, getStatusLabel } = useGoals()

function getRowItems(goal: Goal) {
  const items = [
    {
      label: 'Editar',
      icon: 'i-lucide-pencil',
      onSelect: () => emit('edit', goal)
    }
  ]

  if (goal.status === GoalStatus.Active) {
    items.push({
      label: 'Concluir',
      icon: 'i-lucide-check-circle',
      onSelect: () => emit('complete', goal)
    })
  }

  if (goal.status === GoalStatus.Archived) {
    items.push({
      label: 'Restaurar',
      icon: 'i-lucide-rotate-ccw',
      onSelect: () => emit('restore', goal)
    })
  } else {
    items.push({
      label: 'Arquivar',
      icon: 'i-lucide-archive',
      onSelect: () => emit('archive', goal)
    })
  }

  return items
}
</script>

<template>
  <div class="space-y-4">
    <!-- Loading skeletons -->
    <template v-if="loading">
      <UCard v-for="i in 6" :key="i">
        <div class="flex items-center gap-3">
          <div class="flex-1 space-y-2">
            <USkeleton class="h-4 w-2/3" />
            <USkeleton class="h-3 w-1/3" />
          </div>
          <USkeleton class="h-5 w-16 rounded-full" />
          <USkeleton class="h-2 w-24 rounded-full" />
        </div>
      </UCard>
    </template>

    <!-- Goals list -->
    <template v-else-if="goals.length > 0">
      <UCard
        v-for="goal in goals"
        :key="goal.id"
        class="cursor-pointer transition-colors hover:bg-elevated/50"
        @click="emit('select', goal.id)"
      >
        <div class="flex items-center gap-3">
          <div class="flex-1 min-w-0">
            <p class="font-medium text-highlighted truncate">
              {{ goal.title }}
            </p>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-xs text-muted">
                {{ getLifeCategoryLabel(goal.lifeCategory) }}
              </span>
              <span class="text-xs text-muted">
                · {{ getTimeCategoryLabel(goal.timeCategory) }}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-3 shrink-0">
            <UBadge
              :label="getStatusLabel(goal.status)"
              :color="getStatusColor(goal.status)"
              variant="subtle"
              size="xs"
            />

            <!-- Progress bar -->
            <div class="flex items-center gap-2 min-w-[6rem]">
              <UProgress
                :model-value="Number(goal.progress)"
                :max="100"
                size="xs"
                class="flex-1"
              />
              <span class="text-xs text-muted tabular-nums w-8 text-right">
                {{ Math.round(goal.progress) }}%
              </span>
            </div>

            <UDropdownMenu
              :items="getRowItems(goal)"
              :content="{ align: 'end' }"
            >
              <UButton
                icon="i-lucide-ellipsis-vertical"
                color="neutral"
                variant="ghost"
                size="xs"
                @click.stop
              />
            </UDropdownMenu>
          </div>
        </div>
      </UCard>
    </template>

    <!-- Empty state -->
    <div v-else class="flex flex-col items-center justify-center py-12 gap-3">
      <UIcon name="i-lucide-target" class="size-12 text-dimmed" />
      <p class="text-sm text-muted">
        Nenhuma meta encontrada
      </p>
    </div>

    <!-- Pagination -->
    <div v-if="total > pageSize" class="flex justify-center pt-2">
      <UPagination
        :model-value="page"
        :total="total"
        :items-per-page="pageSize"
        @update:model-value="emit('update:page', $event)"
      />
    </div>
  </div>
</template>
