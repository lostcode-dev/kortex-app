<script setup lang="ts">
import { BaseTree } from '@he-tree/vue'
import type { HabitStack, TodayHabit } from '~/types/habits'
import { DIFFICULTY_META, HABIT_TYPE_META } from '~/types/habits'

interface TodayTreeNode {
  id: string
  habit: TodayHabit
  children: TodayTreeNode[]
  open?: boolean
}

interface TreeStat {
  open: boolean
  level: number
  data: TodayTreeNode
}

const props = defineProps<{
  habits: TodayHabit[]
  stacks?: HabitStack[]
  completedCount: number
  totalCount: number
  loading: boolean
  currentDate: string
}>()

const emit = defineEmits<{
  toggle: [habitId: string, completed: boolean]
  select: [habitId: string]
  'log-with-note': [habitId: string, completed: boolean, note: string]
  'navigate-date': [direction: 'prev' | 'next']
}>()

// ─── Note modal ───────────────────────────────────────────────────────────────
const noteModalOpen = ref(false)
const noteHabitId = ref<string | null>(null)
const noteCompleted = ref(true)
const noteText = ref('')

function openNoteModal(habitId: string, completed: boolean) {
  noteHabitId.value = habitId
  noteCompleted.value = completed
  noteText.value = ''
  noteModalOpen.value = true
}

function submitNote() {
  if (!noteHabitId.value) return
  emit('log-with-note', noteHabitId.value, noteCompleted.value, noteText.value)
  noteModalOpen.value = false
  noteHabitId.value = null
  noteText.value = ''
}

const allDone = computed(() => props.totalCount > 0 && props.completedCount === props.totalCount)

const formattedDate = computed(() => {
  const d = new Date(props.currentDate + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })
})

const isToday = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return props.currentDate === today
})

const treeRef = ref<InstanceType<typeof BaseTree> | null>(null)
const treeData = ref<TodayTreeNode[]>([])
const collapsedIds = ref<string[]>([])
const virtualizationEnabled = computed(() => props.habits.length > 12)

function nodeKeyFn(stat: any) {
  return stat.data.id
}

function compareHabits(left: TodayHabit, right: TodayHabit): number {
  if (left.sortOrder !== right.sortOrder) {
    return left.sortOrder - right.sortOrder
  }
  return left.name.localeCompare(right.name, 'pt-BR')
}

function buildTreeData(): TodayTreeNode[] {
  const visibleHabits = [...(props.habits ?? [])].sort(compareHabits)
  if (visibleHabits.length === 0) return []

  const hiddenIds = new Set(collapsedIds.value)
  const visibleHabitIds = new Set(visibleHabits.map(h => h.id))
  const childrenByParent = new Map<string, string[]>()
  const parentsByChild = new Map<string, string>()
  const habitById = new Map(visibleHabits.map(h => [h.id, h] as const))

  for (const stack of props.stacks ?? []) {
    if (!visibleHabitIds.has(stack.triggerHabitId) || !visibleHabitIds.has(stack.newHabitId)) continue

    const parentChildren = childrenByParent.get(stack.triggerHabitId) ?? []
    if (!parentChildren.includes(stack.newHabitId)) {
      parentChildren.push(stack.newHabitId)
      parentChildren.sort((a, b) => {
        const ha = habitById.get(a)
        const hb = habitById.get(b)
        if (!ha || !hb) return 0
        return compareHabits(ha, hb)
      })
      childrenByParent.set(stack.triggerHabitId, parentChildren)
    }

    parentsByChild.set(stack.newHabitId, stack.triggerHabitId)
  }

  const roots: TodayTreeNode[] = []
  const visited = new Set<string>()

  function buildNode(habitId: string): TodayTreeNode | null {
    if (visited.has(habitId)) return null
    const habit = habitById.get(habitId)
    if (!habit) return null

    visited.add(habitId)
    const childIds = childrenByParent.get(habitId) ?? []
    const children = childIds
      .map(id => buildNode(id))
      .filter((n): n is TodayTreeNode => n !== null)

    return { id: habit.id, habit, children, open: !hiddenIds.has(habit.id) }
  }

  for (const habit of visibleHabits) {
    if (!parentsByChild.has(habit.id)) {
      const root = buildNode(habit.id)
      if (root) roots.push(root)
    }
  }

  // Orphans fallback
  for (const habit of visibleHabits) {
    const root = buildNode(habit.id)
    if (root) roots.push(root)
  }

  return roots
}

watch(
  () => [props.habits, props.stacks],
  () => { treeData.value = buildTreeData() },
  { immediate: true, deep: true }
)

function expandAll() {
  collapsedIds.value = []
  treeRef.value?.openAll()
}

function collapseAll() {
  const ids: string[] = []
  function collect(nodes: TodayTreeNode[]) {
    for (const n of nodes) { ids.push(n.id); collect(n.children) }
  }
  collect(treeData.value)
  collapsedIds.value = ids
  treeRef.value?.closeAll()
}

function onTreeOpened(stat: TreeStat) {
  collapsedIds.value = collapsedIds.value.filter(id => id !== stat.data.id)
}

function onTreeClosed(stat: TreeStat) {
  if (!collapsedIds.value.includes(stat.data.id)) {
    collapsedIds.value = [...collapsedIds.value, stat.data.id]
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Date navigation -->
    <div class="flex items-center justify-between">
      <UButton
        icon="i-lucide-chevron-left"
        color="neutral"
        variant="ghost"
        size="sm"
        aria-label="Dia anterior"
        @click="emit('navigate-date', 'prev')"
      />
      <div class="text-center">
        <p class="text-sm font-medium text-highlighted capitalize">
          {{ formattedDate }}
        </p>
        <UBadge v-if="isToday" label="Hoje" variant="subtle" color="primary" size="xs" />
      </div>
      <UButton
        icon="i-lucide-chevron-right"
        color="neutral"
        variant="ghost"
        size="sm"
        aria-label="Próximo dia"
        @click="emit('navigate-date', 'next')"
      />
    </div>

    <!-- Progress bar -->
    <div v-if="totalCount > 0" class="space-y-1">
      <div class="flex items-center justify-between text-sm">
        <span class="text-muted">Progresso do dia</span>
        <span class="font-medium text-highlighted">{{ completedCount }}/{{ totalCount }}</span>
      </div>
      <UProgress
        :model-value="Number(completedCount)"
        :max="Number(totalCount)"
        size="sm"
      />
    </div>

    <!-- All done state -->
    <UCard v-if="allDone" class="text-center">
      <div class="flex flex-col items-center gap-2 py-4">
        <UIcon name="i-lucide-party-popper" class="size-10 text-primary" />
        <p class="font-medium text-highlighted">
          Parabéns! Todos os hábitos de hoje foram concluídos.
        </p>
        <p class="text-sm text-muted">
          Você está construindo a sua identidade.
        </p>
      </div>
    </UCard>

    <!-- Loading skeletons -->
    <template v-if="loading">
      <UCard v-for="i in 4" :key="i">
        <div class="flex items-center gap-3">
          <USkeleton class="size-5 rounded" />
          <div class="flex-1 space-y-2">
            <USkeleton class="h-4 w-3/4" />
            <USkeleton class="h-3 w-1/3" />
          </div>
          <USkeleton class="h-5 w-12 rounded-full" />
        </div>
      </UCard>
    </template>

    <!-- Habits tree -->
    <template v-else-if="habits.length > 0 && !allDone">
      <div class="today-tree-shell rounded-2xl border border-default/60 bg-default/50 p-3">
        <BaseTree
          ref="treeRef"
          v-model="treeData"
          children-key="children"
          :node-key="nodeKeyFn"
          :indent="24"
          :tree-line="true"
          :tree-line-offset="10"
          :default-open="true"
          :virtualization="virtualizationEnabled"
          :virtualization-prerender-count="20"
          :watermark="false"
          @open:node="onTreeOpened"
          @close:node="onTreeClosed"
        >
          <template #default="{ node, stat }: { node: TodayTreeNode; stat: TreeStat }">
            <div
              class="today-tree-row mb-3 rounded-xl border border-default/60 p-3 shadow-sm transition-colors hover:bg-elevated/50"
              :class="node.habit.log?.completed ? 'bg-success/5 border-success/20' : 'bg-default/70'"
              @click="emit('select', node.habit.id)"
            >
              <div class="flex items-start gap-2.5 sm:items-center sm:gap-3">
                <!-- Expand/collapse -->
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
                          @click.stop="openNoteModal(node.habit.id, !(node.habit.log?.completed ?? false))"
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
                      @click.stop="openNoteModal(node.habit.id, !(node.habit.log?.completed ?? false))"
                    />
                  </div>
                </div>
              </div>
            </div>
          </template>
        </BaseTree>
      </div>
    </template>

    <!-- Empty state -->
    <div v-else-if="!loading && habits.length === 0" class="flex flex-col items-center justify-center gap-4 py-12">
      <UIcon name="i-lucide-sun" class="size-12 text-dimmed" />
      <div class="text-center">
        <p class="font-medium text-highlighted">
          Nenhum hábito para {{ isToday ? 'hoje' : 'este dia' }}
        </p>
        <p class="text-sm text-muted">
          Crie seu primeiro hábito para começar a trilhar o caminho.
        </p>
      </div>
    </div>

    <!-- Note modal -->
    <UModal
      :open="noteModalOpen"
      title="Adicionar observação"
      @update:open="noteModalOpen = $event"
    >
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-muted">
            {{ noteCompleted ? 'Marcar como feito com observação:' : 'Marcar como não feito com observação:' }}
          </p>
          <UTextarea
            v-model="noteText"
            placeholder="O que aconteceu? O que funcionou ou não?"
            class="w-full"
            :rows="3"
          />
          <div class="flex justify-end gap-2">
            <UButton
              icon="i-lucide-x"
              label="Cancelar"
              color="neutral"
              variant="subtle"
              @click="noteModalOpen = false"
            />
            <UButton
              icon="i-lucide-check"
              label="Salvar"
              :loading="false"
              @click="submitNote"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
:deep(.today-tree-shell .he-tree) {
  max-height: 70vh;
  overflow: auto;
}

:deep(.today-tree-shell .tree-line) {
  background-color: color-mix(in srgb, var(--ui-border) 80%, transparent);
}
</style>
