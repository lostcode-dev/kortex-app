<script setup lang="ts">
import { Draggable } from '@he-tree/vue'
import type { Habit, HabitStack, HabitTreeSyncNode } from '~/types/habits'
import { DIFFICULTY_META, FREQUENCY_META, HABIT_TYPE_META } from '~/types/habits'

interface HabitSortableTreeNode {
  id: string
  habit: Habit
  children: HabitSortableTreeNode[]
  open?: boolean
}

interface TreeStat {
  open: boolean
  level: number
  data: HabitSortableTreeNode
}

const props = defineProps<{
  habits: Habit[]
  stacks: HabitStack[]
  total: number
  page: number
  pageSize: number
  loading: boolean
}>()

const emit = defineEmits<{
  'update:page': [value: number]
  'select': [habitId: string]
  'edit': [habit: Habit]
  'stack': [habit: Habit]
  'remove-stacks': [habit: Habit]
  'archive': [habit: Habit]
  'sync-tree': [nodes: HabitTreeSyncNode[]]
}>()

const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const treeRef = ref<{ openAll: () => void, closeAll: () => void } | null>(null)
const treeData = ref<HabitSortableTreeNode[]>([])
const collapsedIds = ref<string[]>([])
const virtualizationEnabled = computed(() => props.habits.length > 12)

function nodeKeyFn(stat: any) {
  return stat.data.id
}

function compareHabits(left: Habit, right: Habit): number {
  if (left.sortOrder !== right.sortOrder) {
    return left.sortOrder - right.sortOrder
  }

  return left.name.localeCompare(right.name, 'pt-BR')
}

function buildTreeData(): HabitSortableTreeNode[] {
  const visibleHabits = [...(props.habits ?? [])].sort(compareHabits)

  if (visibleHabits.length === 0) return []

  const hiddenIds = new Set(collapsedIds.value)
  const visibleHabitIds = new Set(visibleHabits.map((habit) => habit.id))
  const childrenByParent = new Map<string, string[]>()
  const parentsByChild = new Map<string, string>()
  const habitById = new Map(visibleHabits.map((habit) => [habit.id, habit] as const))

  for (const stack of props.stacks ?? []) {
    if (!visibleHabitIds.has(stack.triggerHabitId) || !visibleHabitIds.has(stack.newHabitId)) {
      continue
    }

    const parentChildren = childrenByParent.get(stack.triggerHabitId) ?? []
    if (!parentChildren.includes(stack.newHabitId)) {
      parentChildren.push(stack.newHabitId)
      parentChildren.sort((leftId, rightId) => {
        const leftHabit = habitById.get(leftId)
        const rightHabit = habitById.get(rightId)

        if (!leftHabit || !rightHabit) return 0

        return compareHabits(leftHabit, rightHabit)
      })
      childrenByParent.set(stack.triggerHabitId, parentChildren)
    }

    parentsByChild.set(stack.newHabitId, stack.triggerHabitId)
  }

  const roots: HabitSortableTreeNode[] = []
  const visited = new Set<string>()

  function buildNode(habitId: string): HabitSortableTreeNode | null {
    if (visited.has(habitId)) return null

    const habit = habitById.get(habitId)
    if (!habit) return null

    visited.add(habitId)

    const childIds = childrenByParent.get(habitId) ?? []
    const children = childIds
      .map((childId) => buildNode(childId))
      .filter((child): child is HabitSortableTreeNode => child !== null)

    return {
      id: habit.id,
      habit,
      children,
      open: !hiddenIds.has(habit.id)
    }
  }

  for (const habit of visibleHabits) {
    if (!parentsByChild.has(habit.id)) {
      const root = buildNode(habit.id)
      if (root) roots.push(root)
    }
  }

  for (const habit of visibleHabits) {
    const root = buildNode(habit.id)
    if (root) roots.push(root)
  }

  return roots
}

watch(
  () => [props.habits, props.stacks],
  () => {
    treeData.value = buildTreeData()
  },
  { immediate: true, deep: true }
)

function serializeTree(nodes: HabitSortableTreeNode[]): HabitTreeSyncNode[] {
  return nodes.map((node) => ({
    habitId: node.habit.id,
    children: serializeTree(node.children)
  }))
}

function getOutgoingStacks(habit: Habit): HabitStack[] {
  return (props.stacks ?? []).filter((stack) => stack.triggerHabitId === habit.id)
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

function expandAll() {
  collapsedIds.value = []
  treeRef.value?.openAll()
}

function collapseAll() {
  const ids: string[] = []

  function collect(nodes: HabitSortableTreeNode[]) {
    for (const node of nodes) {
      ids.push(node.habit.id)
      collect(node.children)
    }
  }

  collect(treeData.value)
  collapsedIds.value = ids
  treeRef.value?.closeAll()
}

function onTreeOpened(stat: TreeStat) {
  collapsedIds.value = collapsedIds.value.filter((id) => id !== stat.data.habit.id)
}

function onTreeClosed(stat: TreeStat) {
  if (!collapsedIds.value.includes(stat.data.habit.id)) {
    collapsedIds.value = [...collapsedIds.value, stat.data.habit.id]
  }
}

function onAfterDrop() {
  emit('sync-tree', serializeTree(treeData.value))
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
          <USkeleton class="h-5 w-14 rounded-full" />
        </div>
      </UCard>
    </template>

    <!-- Habits list -->
    <template v-else-if="habits.length > 0">
      <div class="space-y-4">
        <div class="habit-tree-shell rounded-2xl border border-default/60 bg-default/50 p-3">
          <Draggable
            ref="treeRef"
            v-model="treeData"
            children-key="children"
            :node-key="nodeKeyFn"
            trigger-class="habit-tree-drag-handle"
            :indent="24"
            :tree-line="true"
            :tree-line-offset="10"
            :default-open="true"
            :virtualization="virtualizationEnabled"
            :virtualization-prerender-count="20"
            :watermark="false"
            @open:node="onTreeOpened"
            @close:node="onTreeClosed"
            @after-drop="onAfterDrop"
          >
            <template #default="{ node, stat }: { node: HabitSortableTreeNode; stat: TreeStat }">
              <div
                class="habit-tree-row mb-3 rounded-xl border border-default/60 bg-default/70 p-3 shadow-sm transition-colors hover:bg-elevated/50"
                @click="emit('select', node.habit.id)"
              >
                <div class="flex items-start gap-2.5 sm:gap-3">
                  <div class="flex items-center gap-1 pt-0.5">
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

                    <button
                      type="button"
                      class="habit-tree-drag-handle inline-flex size-7 cursor-grab items-center justify-center rounded-md text-muted transition hover:bg-muted/60 hover:text-highlighted active:cursor-grabbing"
                      aria-label="Reordenar hábito"
                      @click.stop
                    >
                      <UIcon name="i-lucide-grip-vertical" class="size-4" />
                    </button>
                  </div>

                  <UIcon
                    :name="HABIT_TYPE_META[node.habit.habitType ?? 'positive'].icon"
                    class="mt-1 size-4 shrink-0"
                    :class="node.habit.habitType === 'negative' ? 'text-error' : 'text-success'"
                  />

                  <div class="min-w-0 flex-1">
                    <div class="flex items-start justify-between gap-2">
                      <p class="min-w-0 text-sm font-medium leading-5 text-highlighted sm:truncate sm:text-base">
                        {{ node.habit.name }}
                      </p>

                      <UDropdownMenu class="shrink-0 sm:hidden" :items="getRowItems(node.habit)" :content="{ align: 'end' }">
                        <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" size="xs" @click.stop />
                      </UDropdownMenu>
                    </div>

                    <div class="mt-1.5 flex flex-wrap items-center gap-1.5 sm:mt-1">
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
                        {{ node.habit.customDays.map((day: number) => dayLabels[day]).join(', ') }}
                      </span>

                      <UBadge class="sm:hidden" :color="DIFFICULTY_META[node.habit.difficulty].color" variant="subtle" size="xs">
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
                        <span>{{ node.habit.streak.currentStreak }}d</span>
                      </div>
                    </div>
                  </div>

                  <div class="hidden shrink-0 items-center gap-2 sm:flex">
                    <UBadge :color="DIFFICULTY_META[node.habit.difficulty].color" variant="subtle" size="xs">
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

                    <UDropdownMenu :items="getRowItems(node.habit)" :content="{ align: 'end' }">
                      <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" size="xs" @click.stop />
                    </UDropdownMenu>
                  </div>
                </div>
              </div>
            </template>

            <template #placeholder>
              <div class="rounded-xl border border-dashed border-primary/40 bg-primary/6 px-3 py-3 text-sm text-muted">
                Solte aqui para reposicionar o hábito.
              </div>
            </template>
          </Draggable>
        </div>
      </div>
    </template>

    <!-- Empty state -->
    <div v-else class="flex flex-col items-center justify-center gap-4 py-12">
      <UIcon name="i-lucide-inbox" class="size-12 text-dimmed" />
      <div class="text-center">
        <p class="font-medium text-highlighted">
          Nenhum hábito encontrado
        </p>
        <p class="text-sm text-muted">
          Ajuste os filtros ou crie um novo hábito.
        </p>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="total > pageSize" class="flex justify-center pt-2">
      <UPagination
        :default-page="page"
        :items-per-page="pageSize"
        :total="total"
        @update:page="emit('update:page', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
:deep(.habit-tree-shell .he-tree) {
  max-height: 70vh;
  overflow: auto;
}

:deep(.habit-tree-shell .tree-line) {
  background-color: color-mix(in srgb, var(--ui-border) 80%, transparent);
}

:deep(.habit-tree-shell .he-tree-drag-placeholder) {
  height: 56px;
  border-radius: 0.875rem;
  border-color: color-mix(in srgb, var(--ui-primary) 45%, transparent);
  background: color-mix(in srgb, var(--ui-primary) 8%, transparent);
}
</style>
