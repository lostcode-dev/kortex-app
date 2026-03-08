<script setup lang="ts">
import type { Habit, HabitStack, HabitTreeNode } from '~/types/habits'
import { DIFFICULTY_META, FREQUENCY_META, HABIT_TYPE_META } from '~/types/habits'

const props = defineProps<{
  node: HabitTreeNode
  stacks?: HabitStack[]
  depth?: number
  isLast?: boolean
  ancestorHasNext?: boolean[]
}>()

const emit = defineEmits<{
  select: [habitId: string]
  edit: [habit: Habit]
  stack: [habit: Habit]
  'remove-stacks': [habit: Habit]
  archive: [habit: Habit]
}>()

const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const depth = computed(() => props.depth ?? 0)
const isLast = computed(() => props.isLast ?? true)
const ancestorHasNext = computed(() => props.ancestorHasNext ?? [])

const INDENT_SIZE = 20
const CONNECTOR_OFFSET = 10
const ROW_MIDPOINT = '1.75rem'
const DOT_SIZE = 8

const treePaddingLeft = computed(() => {
  if (depth.value === 0) return '0px'
  return `${(ancestorHasNext.value.length + 1) * INDENT_SIZE}px`
})

const currentConnectorLeft = computed(() => {
  if (depth.value === 0) return '0px'
  return `${ancestorHasNext.value.length * INDENT_SIZE + CONNECTOR_OFFSET}px`
})

const ancestorConnectors = computed(() => {
  return ancestorHasNext.value.map((hasNext, index) => ({
    hasNext,
    left: `${index * INDENT_SIZE + CONNECTOR_OFFSET}px`
  }))
})

const showConnectorTail = computed(() => depth.value > 0 && (props.node.children.length > 0 || !isLast.value))

function getOutgoingStacks(habit: Habit): HabitStack[] {
  return (props.stacks ?? []).filter((stack) => stack.triggerHabitId === habit.id)
}

function getIncomingStacks(habit: Habit): HabitStack[] {
  return (props.stacks ?? []).filter((stack) => stack.newHabitId === habit.id)
}

function getStackDescription(habit: Habit): string | null {
  const outgoing = getOutgoingStacks(habit)
  const incoming = getIncomingStacks(habit)

  if (outgoing.length > 0) {
    if (outgoing.length === 1) {
      return `Depois deste hábito, faça ${outgoing[0]?.newHabit?.name ?? 'o próximo hábito'}`
    }

    return `Depois deste hábito, faça ${outgoing.length} hábitos em sequência`
  }

  if (incoming.length > 0) {
    return `Este hábito acontece depois de ${incoming[0]?.triggerHabit?.name ?? 'outro hábito'}`
  }

  return null
}

function getRowItems(habit: Habit) {
  const hasOutgoingStacks = getOutgoingStacks(habit).length > 0

  return [
    {
      label: 'Editar',
      icon: 'i-lucide-pencil',
      onSelect: () => emit('edit', habit)
    },
    {
      label: hasOutgoingStacks ? 'Remover empilhados' : 'Empilhar',
      icon: hasOutgoingStacks ? 'i-lucide-unlink' : 'i-lucide-link',
      onSelect: () => hasOutgoingStacks ? emit('remove-stacks', habit) : emit('stack', habit)
    },
    {
      type: 'separator' as const
    },
    {
      label: 'Arquivar',
      icon: 'i-lucide-archive',
      color: 'error' as const,
      onSelect: () => emit('archive', habit)
    }
  ]
}

function onChildSelect(habitId: string) {
  emit('select', habitId)
}

function onChildEdit(habit: Habit) {
  emit('edit', habit)
}

function onChildStack(habit: Habit) {
  emit('stack', habit)
}

function onChildRemoveStacks(habit: Habit) {
  emit('remove-stacks', habit)
}

function onChildArchive(habit: Habit) {
  emit('archive', habit)
}
</script>

<template>
  <div class="relative space-y-3">
    <div
      v-for="(connector, index) in ancestorConnectors"
      :key="`${node.habit.id}-ancestor-${index}`"
      v-show="connector.hasNext"
      class="pointer-events-none absolute top-0 bottom-0 w-px bg-muted/70"
      :style="{ left: connector.left }"
    />

    <div
      v-if="depth > 0"
      class="pointer-events-none absolute w-px bg-muted/70"
      :style="{ left: currentConnectorLeft, top: '0', height: ROW_MIDPOINT }"
    />

    <div
      v-if="depth > 0"
      class="pointer-events-none absolute h-px bg-muted/70"
      :style="{ left: currentConnectorLeft, top: ROW_MIDPOINT, width: `${CONNECTOR_OFFSET}px` }"
    />

    <div
      v-if="depth > 0"
      class="pointer-events-none absolute rounded-full border border-primary/40 bg-default shadow-sm"
      :style="{
        left: `calc(${currentConnectorLeft} - ${DOT_SIZE / 2 - 0.5}px)`,
        top: `calc(${ROW_MIDPOINT} - ${DOT_SIZE / 2}px)`,
        width: `${DOT_SIZE}px`,
        height: `${DOT_SIZE}px`,
      }"
    />

    <div
      v-if="showConnectorTail"
      class="pointer-events-none absolute bottom-0 w-px bg-muted/70"
      :style="{ left: currentConnectorLeft, top: ROW_MIDPOINT }"
    />

    <div :style="{ paddingLeft: treePaddingLeft }">
      <UCard
        :class="[
          'cursor-pointer border border-default/60 transition-colors hover:bg-elevated/50',
          getStackDescription(node.habit) ? 'ring-1 ring-primary/20 bg-primary/4' : 'bg-default/60',
          depth > 0 ? 'shadow-sm' : 'shadow-sm',
        ]"
        @click="emit('select', node.habit.id)"
      >
        <div class="flex items-center gap-3">
          <UIcon
            :name="HABIT_TYPE_META[node.habit.habitType ?? 'positive'].icon"
            class="size-4 shrink-0"
            :class="node.habit.habitType === 'negative' ? 'text-error' : 'text-success'"
          />

          <div class="flex-1 min-w-0">
            <p class="font-medium text-highlighted truncate">
              {{ node.habit.name }}
            </p>
            <div class="mt-1 flex flex-wrap items-center gap-1.5">
              <UBadge
                v-if="node.habit.identity"
                :label="node.habit.identity.name"
                variant="subtle"
                color="primary"
                size="xs"
              />
              <UBadge variant="subtle" color="neutral" size="xs">
                <template #leading>
                  <UIcon :name="FREQUENCY_META[node.habit.frequency].icon" class="size-3" />
                </template>
                {{ FREQUENCY_META[node.habit.frequency].label }}
              </UBadge>
              <span
                v-if="node.habit.frequency === 'custom' && node.habit.customDays?.length"
                class="text-xs text-muted"
              >
                ({{ node.habit.customDays.map((d: number) => dayLabels[d]).join(', ') }})
              </span>
            </div>
            <div
              v-if="depth > 0"
              class="mt-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted"
            >
              <span class="inline-block h-1.5 w-1.5 rounded-full bg-primary/60" />
              <span>Sub-hábito</span>
            </div>
            <div v-if="getStackDescription(node.habit)" class="mt-1 flex items-center gap-1.5 text-xs text-muted">
              <UIcon name="i-lucide-link-2" class="size-3.5 shrink-0 text-primary" />
              <span class="truncate">{{ getStackDescription(node.habit) }}</span>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
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
              <span>{{ node.habit.streak.currentStreak }}d</span>
            </div>

            <UDropdownMenu
              :items="getRowItems(node.habit)"
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
    </div>

    <div v-if="node.children.length" class="space-y-3 pt-1">
      <HabitsAllTreeItem
        v-for="(child, index) in node.children"
        :key="child.habit.id"
        :node="child"
        :stacks="stacks"
        :depth="depth + 1"
        :is-last="index === node.children.length - 1"
        :ancestor-has-next="[...ancestorHasNext, !isLast]"
        @select="onChildSelect"
        @edit="onChildEdit"
        @stack="onChildStack"
        @remove-stacks="onChildRemoveStacks"
        @archive="onChildArchive"
      />
    </div>
  </div>
</template>