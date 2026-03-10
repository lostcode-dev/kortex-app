<script setup lang="ts">
import { z } from 'zod'
import type { Calendar, CalendarEvent } from '~/types/appointments'

const props = defineProps<{
  open: boolean
  event: CalendarEvent | null
  calendars: Calendar[] | null | undefined
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'updated': []
  'archived': []
}>()

const { updateEvent, archiveEvent, cancelOccurrence, getRecurrenceLabel, recurrenceOptions, NONE_RECURRENCE_VALUE } = useAppointments()
const toast = useToast()

const editing = ref(false)
const saving = ref(false)
const archiving = ref(false)
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

const schema = z.object({
  calendarId: z.string().uuid('Selecione um calendário'),
  title: z.string().min(1, 'Título é obrigatório').max(200),
  description: z.string().max(2000).optional(),
  location: z.string().max(500).optional(),
  startDate: z.string().min(1, 'Data de início é obrigatória'),
  startTime: z.string().optional(),
  endDate: z.string().min(1, 'Data de término é obrigatória'),
  endTime: z.string().optional(),
  allDay: z.boolean().default(false),
  rrule: z.string().optional()
})

type FormState = z.infer<typeof schema>

const state = reactive<FormState>({
  calendarId: '',
  title: '',
  description: '',
  location: '',
  startDate: '',
  startTime: '09:00',
  endDate: '',
  endTime: '10:00',
  allDay: false,
  rrule: ''
})

const rruleModel = computed({
  get: () => state.rrule || NONE_RECURRENCE_VALUE,
  set: (value: string) => {
    state.rrule = value === NONE_RECURRENCE_VALUE ? '' : value
  }
})

const calendarOptions = computed(() =>
  (props.calendars ?? []).map(calendar => ({ label: calendar.name, value: calendar.id }))
)

watch(() => props.event, (event) => {
  if (!event) {
    return
  }

  state.calendarId = event.calendarId
  state.title = event.title
  state.description = event.description ?? ''
  state.location = event.location ?? ''
  state.startDate = toDateInput(event.startAt)
  state.startTime = toTimeInput(event.startAt)
  state.endDate = toDateInput(event.endAt)
  state.endTime = toTimeInput(event.endAt)
  state.allDay = event.allDay
  state.rrule = event.rrule ?? ''
  editing.value = false
}, { immediate: true })

function toDateInput(dateStr: string): string {
  const date = new Date(dateStr)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function toTimeInput(dateStr: string): string {
  const date = new Date(dateStr)

  if (Number.isNaN(date.getTime())) {
    return '09:00'
  }

  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function startEdit() {
  editing.value = true
}

async function saveEdit() {
  if (!props.event || saving.value) {
    return
  }

  const startAt = `${state.startDate}T${state.allDay ? '00:00:00' : `${state.startTime || '00:00'}:00`}`
  const endAt = `${state.endDate}T${state.allDay ? '23:59:59' : `${state.endTime || '00:00'}:00`}`

  if (new Date(endAt) <= new Date(startAt)) {
    toast.add({ title: 'Erro', description: 'A data de término deve ser posterior à data de início', color: 'error' })
    return
  }

  saving.value = true

  try {
    const success = await updateEvent(props.event.id, {
      calendarId: state.calendarId,
      title: state.title,
      description: state.description || null,
      location: state.location || null,
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      eventTimezone: props.event.eventTimezone || timezone,
      allDay: state.allDay,
      rrule: state.rrule || null
    })

    if (success) {
      editing.value = false
      emit('updated')
    }
  } finally {
    saving.value = false
  }
}

async function onArchive() {
  if (!props.event || archiving.value) {
    return
  }

  archiving.value = true

  try {
    const success = await archiveEvent(props.event.id)

    if (success) {
      emit('update:open', false)
      emit('archived')
    }
  } finally {
    archiving.value = false
  }
}

async function onCancelOccurrence(recurrenceId: string) {
  if (!props.event) {
    return
  }

  const success = await cancelOccurrence(props.event.id, { recurrenceId })

  if (success) {
    emit('update:open', false)
    emit('updated')
  }
}

function formatDateTime(dateStr: string, allDay: boolean): string {
  const date = new Date(dateStr)

  if (Number.isNaN(date.getTime())) {
    return 'Data inválida'
  }

  const dateFormatted = date.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })

  if (allDay) {
    return dateFormatted
  }

  const time = date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })

  return `${dateFormatted} às ${time}`
}
</script>

<template>
  <USlideover
    :open="open"
    title="Detalhes do evento"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div
        v-if="props.loading"
        class="space-y-4"
      >
        <USkeleton class="h-8 w-2/3" />
        <USkeleton class="h-5 w-1/2" />
        <USkeleton class="h-16 w-full" />
        <USkeleton class="h-24 w-full" />
      </div>

      <div
        v-else-if="!event"
        class="flex flex-col items-center justify-center gap-3 py-12"
      >
        <UIcon
          name="i-lucide-calendar-x"
          class="size-12 text-dimmed"
        />
        <p class="text-sm text-muted">
          Nenhum evento selecionado
        </p>
      </div>

      <div
        v-else-if="!editing"
        class="space-y-6"
      >
        <div class="space-y-2">
          <h3 class="text-lg font-semibold text-highlighted">
            {{ event.title }}
          </h3>
          <div class="flex flex-wrap items-center gap-2 text-sm text-muted">
            <UIcon
              name="i-lucide-clock"
              class="size-4"
            />
            <span>{{ formatDateTime(event.startAt, event.allDay) }}</span>
            <span>até</span>
            <span>{{ formatDateTime(event.endAt, event.allDay) }}</span>
          </div>
        </div>

        <div
          v-if="event.calendar?.name"
          class="flex items-center gap-2 text-sm"
        >
          <span
            class="inline-block size-2.5 rounded-full"
            :style="{ backgroundColor: event.calendar?.color ?? '#10b981' }"
          />
          <span>{{ event.calendar?.name }}</span>
        </div>

        <div
          v-if="event.location"
          class="flex items-center gap-2 text-sm"
        >
          <UIcon
            name="i-lucide-map-pin"
            class="size-4 text-muted"
          />
          <span>{{ event.location }}</span>
        </div>

        <div
          v-if="event.rrule"
          class="flex items-center gap-2 text-sm"
        >
          <UIcon
            name="i-lucide-repeat"
            class="size-4 text-muted"
          />
          <span>{{ getRecurrenceLabel(event.rrule) }}</span>
        </div>

        <div v-if="event.description">
          <h4 class="mb-1 text-sm font-medium text-highlighted">
            Descrição
          </h4>
          <p class="whitespace-pre-wrap text-sm text-muted">
            {{ event.description }}
          </p>
        </div>

        <div v-if="event.reminders && event.reminders.length > 0">
          <h4 class="mb-1 text-sm font-medium text-highlighted">
            Lembretes
          </h4>
          <div class="space-y-1">
            <div
              v-for="reminder in event.reminders"
              :key="reminder.id"
              class="flex items-center gap-2 text-sm text-muted"
            >
              <UIcon
                name="i-lucide-bell"
                class="size-3.5"
              />
              <span>{{ reminder.minutesBefore }} min antes</span>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap gap-2 border-t border-default pt-4">
          <UButton
            label="Editar"
            icon="i-lucide-pencil"
            variant="outline"
            size="sm"
            @click="startEdit"
          />
          <UButton
            v-if="event.recurrenceId"
            label="Cancelar ocorrência"
            icon="i-lucide-x"
            variant="outline"
            size="sm"
            color="error"
            @click="onCancelOccurrence(event.recurrenceId)"
          />
          <UButton
            label="Arquivar"
            icon="i-lucide-archive"
            variant="outline"
            size="sm"
            color="error"
            :loading="archiving"
            :disabled="archiving"
            @click="onArchive"
          />
        </div>
      </div>

      <UForm
        v-else
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="saveEdit"
      >
        <UFormField
          label="Calendário"
          name="calendarId"
        >
          <USelect
            v-model="state.calendarId"
            :items="calendarOptions"
            placeholder="Selecione..."
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Título"
          name="title"
        >
          <UInput
            v-model="state.title"
            placeholder="Título"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Local"
          name="location"
        >
          <UInput
            v-model="state.location"
            placeholder="Local"
            icon="i-lucide-map-pin"
            class="w-full"
          />
        </UFormField>

        <UCheckbox
          :model-value="state.allDay"
          label="Dia inteiro"
          size="sm"
          @update:model-value="state.allDay = Boolean($event)"
        />

        <div class="grid grid-cols-2 gap-3">
          <UFormField
            label="Data início"
            name="startDate"
          >
            <UInput
              v-model="state.startDate"
              type="date"
              class="w-full"
            />
          </UFormField>

          <UFormField
            v-if="!state.allDay"
            label="Hora início"
            name="startTime"
          >
            <UInput
              v-model="state.startTime"
              type="time"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <UFormField
            label="Data término"
            name="endDate"
          >
            <UInput
              v-model="state.endDate"
              type="date"
              class="w-full"
            />
          </UFormField>

          <UFormField
            v-if="!state.allDay"
            label="Hora término"
            name="endTime"
          >
            <UInput
              v-model="state.endTime"
              type="time"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField
          label="Recorrência"
          name="rrule"
        >
          <USelect
            v-model="rruleModel"
            :items="recurrenceOptions"
            value-key="value"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Descrição"
          name="description"
        >
          <UTextarea
            v-model="state.description"
            placeholder="Descrição"
            :rows="4"
            class="w-full"
          />
        </UFormField>

        <div class="flex flex-wrap gap-2 border-t border-default pt-4">
          <UButton
            type="submit"
            label="Salvar"
            icon="i-lucide-check"
            size="sm"
            :loading="saving"
            :disabled="saving"
          />
          <UButton
            label="Cancelar"
            variant="outline"
            size="sm"
            @click="editing = false"
          />
        </div>
      </UForm>
    </template>
  </USlideover>
</template>
