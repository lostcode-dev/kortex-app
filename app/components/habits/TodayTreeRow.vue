<script setup lang="ts">
import type { TodayHabit } from '~/types/habits'
import { DIFFICULTY_META, HABIT_TYPE_META } from '~/types/habits'

interface TodayTreeNode {
  id: string
  habit: TodayHabit
  children: TodayTreeNode[]
  open?: boolean
}

interface TreeStat {
  open: boolean
}

defineProps<{
  node: TodayTreeNode
  stat: TreeStat
}>()

const emit = defineEmits<{
  toggle: [habitId: string, completed: boolean]
  select: [habitId: string]
  'open-note': [habitId: string, completed: boolean]
}>()
</script>

<template>
  <div
    class="today-tree-row mb-3 rounded-xl border border-default/60 p-3 shadow-sm transition-colors hover:bg-elevated/50"
    :class="node.habit.log?.completed ? 'bg-success/5 border-success/20' : 'bg-default/70'"
    @click="emit('select', node.habit.id)"
  >
    <div class="flex items-start gap-2.5 sm:items-center sm:gap-3">
      <div class="flex items-center gap-1 pt-0.5 sm:pt-0">
        <button
          v-if="node.children.length"
          type="button"
          class="inline-flex size-7 items-center justify-center rounded-md text-muted transition hover:bg-muted/60 hover:text-highlighted"
          @click.stop="stat.open = !stat.open"
        >
          <UIcon :name="stat.open ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="size-4" />
        </button>
        <span v-else class="inline-flex size-7 items-center justify-center text-muted">
          <span class="h-1.5 w-1.5 rounded-full bg-primary/60" />
        </span>

        <UCheckbox
          :model-value="node.habit.log?.completed ?? false"
          @click.stop
          size="sm"
          @update:model-value="emit('toggle', node.habit.id, $event as boolean)""
        />
      </div>

      <div class="min-w-0 flex-1">
        <div class="flex items-start gap-2">
          <UIcon
            :name="HABIT_TYPE_META[node.habit.habitType ?? 'positive'].icon"
            class="mt-1 size-4 shrink-0"
            :class="node.habit.habitType === 'negative' ? 'text-error' : 'text-success'"
          />

          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-2">
              <p
                class="min-w-0 text-sm font-medium leading-5 text-highlighted sm:truncate sm:text-base"
                :class="node.habit.log?.completed ? 'line-through text-muted' : 'text-highlighted'"
              >
                {{ node.habit.name }}
              </p>

              <UButton
                class="shrink-0 sm:hidden"
                :icon="node.habit.log?.completed ? 'i-lucide-message-square' : 'i-lucide-message-square-plus'"
                color="neutral"
                variant="ghost"
                size="xs"
                :aria-label="node.habit.log?.completed ? 'Adicionar nota (feito)' : 'Marcar como não feito com nota'"
                @click.stop="emit('open-note', node.habit.id, !(node.habit.log?.completed ?? false))"
              />
            </div>

            <div class="mt-1.5 flex flex-wrap items-center gap-1.5 sm:mt-1">
              <UBadge
                v-if="node.habit.identity"
                :label="node.habit.identity.name"
                variant="subtle"
                color="primary"
                size="xs"
              />
              <UBadge
                class="sm:hidden"
                :color="DIFFICULTY_META[node.habit.difficulty].color"
                variant="subtle"
                size="xs"
              >
                <template #leading>
                  <UIcon :name="DIFFICULTY_META[node.habit.difficulty].icon" class="size-3" />
                </template>
                {{ DIFFICULTY_META[node.habit.difficulty].label }}
              </UBadge>
              <div
                v-if="node.habit.streak && node.habit.streak.currentStreak > 0"
                class="flex items-center gap-1 text-xs text-muted sm:hidden"
              >
                <UIcon name="i-lucide-flame" class="size-3.5 text-orange-500" />
                <span>{{ node.habit.streak.currentStreak }}</span>
              </div>
            </div>

            <div v-if="node.habit.log?.note" class="mt-2 rounded-lg border border-default/60 bg-default/40 px-2.5 py-2 text-xs italic text-muted">
              "{{ node.habit.log.note }}"
            </div>
          </div>
        </div>

        <div class="mt-2 hidden items-center justify-end gap-1.5 sm:flex">
          <UBadge
            :color="DIFFICULTY_META[node.habit.difficulty].color"
            variant="subtle"
            size="xs"
          >
            <template #leading>
              <UIcon :name="DIFFICULTY_META[node.habit.difficulty].icon" class="size-3" />
            </template>
            {{ DIFFICULTY_META[node.habit.difficulty].label }}
          </UBadge>

          <div
            v-if="node.habit.streak && node.habit.streak.currentStreak > 0"
            class="flex items-center gap-1 text-xs text-muted"
          >
            <UIcon name="i-lucide-flame" class="size-3.5 text-orange-500" />
            <span>{{ node.habit.streak.currentStreak }}</span>
          </div>

          <UButton
            :icon="node.habit.log?.completed ? 'i-lucide-message-square' : 'i-lucide-message-square-plus'"
            color="neutral"
            variant="ghost"
            size="xs"
            :aria-label="node.habit.log?.completed ? 'Adicionar nota (feito)' : 'Marcar como não feito com nota'"
            @click.stop="emit('open-note', node.habit.id, !(node.habit.log?.completed ?? false))"
          />
        </div>
      </div>
    </div>
  </div>
</template>