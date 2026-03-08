<script setup lang="ts">
import type { TodayHabit } from '~/types/habits'
import { DIFFICULTY_META, HABIT_TYPE_META, HabitLogStatus, LOG_STATUS_META } from '~/types/habits'

interface TodayTreeNode {
  id: string
  habit: TodayHabit
  children: TodayTreeNode[]
  open?: boolean
}

interface TreeStat {
  open: boolean
}

interface HabitLawHint {
  key: string
  label: string
  icon: string
  text: string
}

const props = defineProps<{
  node: TodayTreeNode
  stat: TreeStat
}>()

const emit = defineEmits<{
  toggle: [habitId: string, completed: boolean]
  select: [habitId: string]
  'open-note': [habitId: string, completed: boolean]
}>()

function normalizeLawText(value: string | null | undefined): string | null {
  if (!value) return null

  const plainText = value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!plainText) return null

  if (plainText.length <= 140) return plainText
  return `${plainText.slice(0, 137)}...`
}

const lawHints = computed<HabitLawHint[]>(() => {
  const habit = props.node.habit

  return [
    {
      key: 'obvious',
      label: 'Lei 1: Tornar obvio',
      icon: 'i-lucide-eye',
      text: normalizeLawText(habit.obviousStrategy)
    },
    {
      key: 'attractive',
      label: 'Lei 2: Tornar atraente',
      icon: 'i-lucide-sparkles',
      text: normalizeLawText(habit.attractiveStrategy)
    },
    {
      key: 'easy',
      label: 'Lei 3: Tornar facil',
      icon: 'i-lucide-feather',
      text: normalizeLawText(habit.easyStrategy)
    },
    {
      key: 'satisfying',
      label: 'Lei 4: Tornar satisfatorio',
      icon: 'i-lucide-trophy',
      text: normalizeLawText(habit.satisfyingStrategy)
    }
  ].filter((hint): hint is HabitLawHint => Boolean(hint.text))
})

const logStatusMeta = computed(() => {
  const status = props.node.habit.log?.status as HabitLogStatus | undefined
  if (!status) return null
  return LOG_STATUS_META[status] ?? null
})
</script>

<template>
  <div
    class="today-tree-row mb-3 rounded-xl border border-default/60 p-3 shadow-sm transition-colors hover:bg-elevated/50"
    :class="{
      'bg-success/5 border-success/20': node.habit.log?.status === HabitLogStatus.Done,
      'bg-warning/5 border-warning/20': node.habit.log?.status === HabitLogStatus.DoneLater,
      'bg-error/5 border-error/20': node.habit.log?.status === HabitLogStatus.Skipped,
      'bg-default/70': !node.habit.log?.status
    }"
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
          @update:model-value="emit('toggle', node.habit.id, $event as boolean)"
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
                v-if="node.habit.scheduledTime"
                :label="node.habit.scheduledTime"
                variant="subtle"
                color="neutral"
                size="xs"
              >
                <template #leading>
                  <UIcon name="i-lucide-clock" class="size-3" />
                </template>
              </UBadge>
              <UBadge
                v-if="logStatusMeta && node.habit.log?.status !== HabitLogStatus.Done"
                :label="logStatusMeta.label"
                variant="subtle"
                :color="logStatusMeta.color"
                size="xs"
              >
                <template #leading>
                  <UIcon :name="logStatusMeta.icon" class="size-3" />
                </template>
              </UBadge>
              <UBadge
                v-if="node.habit.identity"
                :label="node.habit.identity.name"
                variant="subtle"
                color="primary"
                size="xs"
              />
              <UTooltip
                v-for="hint in lawHints"
                :key="hint.key"
                :text="`${hint.label}: ${hint.text}`"
              >
                <button
                  type="button"
                  class="inline-flex size-6 items-center justify-center rounded-md border border-default/60 bg-default/40 text-muted transition hover:border-primary/40 hover:text-highlighted"
                  :aria-label="`${hint.label}: ${hint.text}`"
                  @click.stop
                >
                  <UIcon :name="hint.icon" class="size-3.5" />
                </button>
              </UTooltip>
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