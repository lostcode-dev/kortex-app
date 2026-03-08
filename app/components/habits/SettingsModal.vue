<script setup lang="ts">
import type { HabitUserSettings, UpdateHabitUserSettingsPayload } from '~/types/habits'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { fetchHabitSettings, updateHabitSettings } = useHabits()

const settings = ref<HabitUserSettings | null>(null)
const loading = ref(true)
const saving = ref(false)

const dayOptions = [
  { label: 'Dom', value: 0 },
  { label: 'Seg', value: 1 },
  { label: 'Ter', value: 2 },
  { label: 'Qua', value: 3 },
  { label: 'Qui', value: 4 },
  { label: 'Sex', value: 5 },
  { label: 'Sáb', value: 6 },
]

watch(() => props.open, async (open) => {
  if (!open) return
  loading.value = true
  settings.value = await fetchHabitSettings()
  loading.value = false
})

async function save(payload: UpdateHabitUserSettingsPayload) {
  saving.value = true
  const result = await updateHabitSettings(payload)
  if (result) settings.value = result
  saving.value = false
}

function onChangeReviewDay(day: number) {
  save({ reviewDay: day })
}

function onToggleReminder() {
  if (!settings.value) return
  save({ reviewReminderEnabled: !settings.value.reviewReminderEnabled })
}

function onChangeReminderTime(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.value) save({ reviewReminderTime: target.value })
}
</script>

<template>
  <UModal
    :open="props.open"
    title="Configurações de hábitos"
    description="Ajuste suas preferências de revisão e lembretes."
    :ui="{
      overlay: 'z-[200] bg-elevated/75',
      content: 'z-[210]'
    }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <template v-if="loading">
        <div class="space-y-4">
          <USkeleton class="h-5 w-1/2" />
          <USkeleton class="h-8 w-full" />
          <USkeleton class="h-5 w-1/3" />
          <USkeleton class="h-8 w-full" />
        </div>
      </template>

      <template v-else-if="settings">
        <div class="space-y-6">
          <!-- Review Day -->
          <div class="space-y-2">
            <p class="text-sm font-medium text-highlighted">
              Dia de revisão semanal
            </p>
            <p class="text-xs text-muted">
              Escolha o dia da semana para fazer sua revisão de hábitos.
            </p>
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="day in dayOptions"
                :key="day.value"
                type="button"
                :label="day.label"
                size="sm"
                :color="settings.reviewDay === day.value ? 'primary' : 'neutral'"
                :variant="settings.reviewDay === day.value ? 'solid' : 'outline'"
                :disabled="saving"
                @click="onChangeReviewDay(day.value)"
              />
            </div>
          </div>

          <!-- Reminder -->
          <div class="space-y-2">
            <div class="flex items-center gap-3">
              <UCheckbox
                :model-value="settings.reviewReminderEnabled"
                label="Lembrete de revisão"
                :disabled="saving"
                @update:model-value="onToggleReminder"
              />
            </div>
            <div v-if="settings.reviewReminderEnabled" class="flex items-center gap-2 pl-7">
              <UInput
                type="time"
                :model-value="settings.reviewReminderTime"
                :disabled="saving"
                class="w-32"
                @change="onChangeReminderTime"
              />
              <span class="text-xs text-muted">Horário do lembrete</span>
            </div>
          </div>
        </div>
      </template>
    </template>

    <template #footer>
      <div class="flex justify-end">
        <UButton
          icon="i-lucide-x"
          label="Fechar"
          color="neutral"
          variant="subtle"
          @click="emit('update:open', false)"
        />
      </div>
    </template>
  </UModal>
</template>
