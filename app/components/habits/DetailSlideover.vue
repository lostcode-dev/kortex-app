<script setup lang="ts">
import type { Habit, HabitStack } from '~/types/habits'
import { DIFFICULTY_META, FREQUENCY_META, HABIT_TYPE_META } from '~/types/habits'

const props = defineProps<{
  habit: Habit
  stacks?: HabitStack[]
  open: boolean
  stackActionsDisabled?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'edit': []
  'stack': []
  'share': []
  'remove-stack': [stackId: string]
  'remove-stacks': []
  'archive': []
  'identityModalOpen': [value: boolean]
}>()

const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR')
}

const triggerStacks = computed(() =>
  (props.stacks ?? []).filter((stack) => stack.triggerHabitId === props.habit.id)
)

const incomingStacks = computed(() =>
  (props.stacks ?? []).filter((stack) => stack.newHabitId === props.habit.id)
)
</script>

<template>
  <USlideover
    :open="props.open"
    title="Detalhes do hábito"
    :ui="{
      overlay: 'z-[80]',
      content: 'z-[90]'
    }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="space-y-6">
        <!-- Header -->
        <div class="flex items-start justify-between">
          <div class="space-y-1 min-w-0">
            <div class="flex items-center gap-2">
              <UIcon
                :name="HABIT_TYPE_META[habit.habitType ?? 'positive'].icon"
                class="size-5 shrink-0"
                :class="habit.habitType === 'negative' ? 'text-error' : 'text-success'"
              />
              <h3 class="text-lg font-semibold text-highlighted truncate">
                {{ habit.name }}
              </h3>
            </div>
            <div
              v-if="habit.description"
              class="habit-description text-sm text-muted"
              v-html="habit.description"
            />
          </div>
          <div class="flex gap-1 shrink-0">
            <UButton
              icon="i-lucide-pencil"
              color="neutral"
              variant="ghost"
              size="sm"
              aria-label="Editar hábito"
              @click="emit('edit')"
            />
            <UButton
              icon="i-lucide-share-2"
              color="neutral"
              variant="ghost"
              size="sm"
              aria-label="Compartilhar progresso"
              @click="emit('share')"
            />
            <UButton
              icon="i-lucide-archive"
              color="error"
              variant="ghost"
              size="sm"
              aria-label="Arquivar hábito"
              @click="emit('archive')"
            />
          </div>
        </div>

        <!-- Badges with icons -->
        <div class="flex flex-wrap gap-2">
          <UBadge variant="subtle" :color="HABIT_TYPE_META[habit.habitType ?? 'positive'].color" size="sm">
            <template #leading>
              <UIcon :name="HABIT_TYPE_META[habit.habitType ?? 'positive'].icon" class="size-3.5" />
            </template>
            {{ HABIT_TYPE_META[habit.habitType ?? 'positive'].label }}
          </UBadge>
          <UBadge variant="subtle" color="neutral" size="sm">
            <template #leading>
              <UIcon :name="FREQUENCY_META[habit.frequency].icon" class="size-3.5" />
            </template>
            {{ FREQUENCY_META[habit.frequency].label }}
          </UBadge>
          <UBadge
            :color="DIFFICULTY_META[habit.difficulty].color"
            variant="subtle"
            size="sm"
          >
            <template #leading>
              <UIcon :name="DIFFICULTY_META[habit.difficulty].icon" class="size-3.5" />
            </template>
            {{ DIFFICULTY_META[habit.difficulty].label }}
          </UBadge>
          <UBadge
            v-if="habit.identity"
            :label="habit.identity.name"
            variant="subtle"
            color="primary"
            size="sm"
          />
        </div>

        <!-- Streak stats with icons -->
        <div v-if="habit.streak" class="grid grid-cols-2 gap-3">
          <UCard>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-flame" class="size-5 text-orange-500 shrink-0" />
              <div>
                <p class="text-2xl font-bold text-highlighted">
                  {{ habit.streak.currentStreak }}
                </p>
                <p class="text-xs text-muted">
                  Streak atual
                </p>
              </div>
            </div>
          </UCard>
          <UCard>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-trophy" class="size-5 text-amber-500 shrink-0" />
              <div>
                <p class="text-2xl font-bold text-highlighted">
                  {{ habit.streak.longestStreak }}
                </p>
                <p class="text-xs text-muted">
                  Maior streak
                </p>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Overview info (no tabs needed) -->
        <div class="space-y-3">
          <div class="text-sm">
            <span class="text-muted">Criado em: </span>
            <span class="text-highlighted">
              {{ formatDate(habit.createdAt) }}
            </span>
          </div>
          <div v-if="habit.streak?.lastCompletedDate" class="text-sm">
            <span class="text-muted">Última conclusão: </span>
            <span class="text-highlighted">
              {{ formatDate(habit.streak.lastCompletedDate) }}
            </span>
          </div>
          <div v-if="habit.customDays?.length" class="text-sm">
            <span class="text-muted">Dias: </span>
            <span class="text-highlighted">
              {{ habit.customDays.map((d: number) => dayLabels[d]).join(', ') }}
            </span>
          </div>
        </div>

        <div v-if="triggerStacks.length || incomingStacks.length" class="space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-link-2" class="size-4 text-primary" />
              <h4 class="text-sm font-semibold text-highlighted">Empilhamento</h4>
            </div>

            <UButton
              icon="i-lucide-link"
              label="Empilhar"
              size="xs"
              variant="subtle"
              color="neutral"
              :disabled="props.stackActionsDisabled"
              @click="emit('stack')"
            />
          </div>

          <p v-if="props.stackActionsDisabled" class="text-xs text-muted">
            Visualização histórica: o empilhamento abaixo reflete a configuração válida nessa data.
          </p>

          <UCard v-if="incomingStacks.length">
            <div class="space-y-2">
              <p class="text-xs font-medium uppercase tracking-wide text-muted">
                Este hábito entra depois de
              </p>
              <div class="space-y-2">
                <div
                  v-for="stack in incomingStacks"
                  :key="stack.id"
                  class="group flex items-center gap-2 rounded-lg border border-default p-2 transition-colors hover:bg-elevated/50"
                >
                  <UIcon name="i-lucide-zap" class="size-3.5 shrink-0 text-warning" />
                  <span class="text-sm text-highlighted truncate flex-1">
                    {{ stack.triggerHabit?.name ?? 'Hábito removido' }}
                  </span>
                  <UButton
                    v-if="!props.stackActionsDisabled"
                    icon="i-lucide-x"
                    color="error"
                    variant="ghost"
                    size="xs"
                    aria-label="Remover empilhamento"
                    class="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    @click="emit('remove-stack', stack.id)"
                  />
                </div>
              </div>
            </div>
          </UCard>

          <UCard v-if="triggerStacks.length">
            <div class="space-y-2">
              <p class="text-xs font-medium uppercase tracking-wide text-muted">
                Depois deste hábito, faça
              </p>
              <div class="space-y-2">
                <div
                  v-for="stack in triggerStacks"
                  :key="stack.id"
                  class="group flex items-center gap-2 rounded-lg border border-default p-2 transition-colors hover:bg-elevated/50"
                >
                  <UIcon name="i-lucide-target" class="size-3.5 shrink-0 text-success" />
                  <span class="text-sm text-highlighted truncate flex-1">
                    {{ stack.newHabit?.name ?? 'Hábito removido' }}
                  </span>
                  <UButton
                    v-if="!props.stackActionsDisabled"
                    icon="i-lucide-x"
                    color="error"
                    variant="ghost"
                    size="xs"
                    aria-label="Remover empilhamento"
                    class="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    @click="emit('remove-stack', stack.id)"
                  />
                </div>
              </div>
            </div>
          </UCard>
        </div>

        <div v-else class="space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-link-2" class="size-4 text-primary" />
              <h4 class="text-sm font-semibold text-highlighted">Empilhamento</h4>
            </div>

            <UButton
              icon="i-lucide-link"
              label="Empilhar"
              size="xs"
              variant="subtle"
              color="neutral"
              :disabled="props.stackActionsDisabled"
              @click="emit('stack')"
            />
          </div>

          <p v-if="props.stackActionsDisabled" class="text-xs text-muted">
            Visualização histórica: o empilhamento desta data não pode ser alterado por aqui.
          </p>

          <UCard>
            <p class="text-sm text-muted">
              Defina o que deve acontecer depois deste hábito para criar uma sequência clara de ações.
            </p>
          </UCard>
        </div>

        <!-- Calendar (always visible, no tab needed) -->
        <HabitsCalendar :habit-id="habit.id" />
      </div>
    </template>
  </USlideover>
</template>

<style scoped>
.habit-description :deep(p) {
  margin: 0;
}

.habit-description :deep(p + p),
.habit-description :deep(ul + p),
.habit-description :deep(ol + p),
.habit-description :deep(blockquote + p),
.habit-description :deep(p + ul),
.habit-description :deep(p + ol) {
  margin-top: 0.5rem;
}

.habit-description :deep(ul),
.habit-description :deep(ol) {
  padding-left: 1.25rem;
}

.habit-description :deep(blockquote) {
  margin-top: 0.5rem;
  border-left: 2px solid var(--ui-border);
  padding-left: 0.75rem;
  color: var(--ui-text-muted);
}

.habit-description :deep(a) {
  color: var(--ui-primary);
  text-decoration: underline;
}
</style>
