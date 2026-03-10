<script setup lang="ts">
import type { CalendarEvent } from '~/types/appointments'

const props = defineProps<{
  events: CalendarEvent[]
  loading: boolean
  currentDate: Date
}>()

const emit = defineEmits<{
  selectEvent: [event: CalendarEvent]
  weekChange: [from: string, to: string]
}>()

// ─── Week navigation ──────────────────────────────────────────────────────
const weekStart = ref(getWeekStart(props.currentDate))

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

function getWeekEnd(start: Date): Date {
  const d = new Date(start)
  d.setDate(d.getDate() + 6)
  d.setHours(23, 59, 59, 999)
  return d
}

const weekLabel = computed(() => {
  const start = weekStart.value
  const end = getWeekEnd(start)
  const startStr = start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  const endStr = end.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  return `${startStr} — ${endStr}`
})

function prevWeek() {
  const d = new Date(weekStart.value)
  d.setDate(d.getDate() - 7)
  weekStart.value = d
  emitRange()
}

function nextWeek() {
  const d = new Date(weekStart.value)
  d.setDate(d.getDate() + 7)
  weekStart.value = d
  emitRange()
}

function goToToday() {
  weekStart.value = getWeekStart(new Date())
  emitRange()
}

function emitRange() {
  const from = formatDate(weekStart.value)
  const end = getWeekEnd(weekStart.value)
  const to = formatDate(end)
  emit('weekChange', from, to)
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ─── Day columns ──────────────────────────────────────────────────────────
interface DayColumn {
  date: Date
  dateStr: string
  dayLabel: string
  dayNumber: number
  isToday: boolean
  events: CalendarEvent[]
}

const weekDays = computed((): DayColumn[] => {
  const today = new Date()
  const todayStr = formatDate(today)
  const days: DayColumn[] = []

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart.value)
    date.setDate(date.getDate() + i)
    const dateStr = formatDate(date)

    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)

    const dayEvents = (props.events ?? []).filter((evt: CalendarEvent) => {
      const evtStart = new Date(evt.startAt)
      const evtEnd = new Date(evt.endAt)
      return evtStart < dayEnd && evtEnd > dayStart
    }).sort((a: CalendarEvent, b: CalendarEvent) =>
      new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    )

    days.push({
      date,
      dateStr,
      dayLabel: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
      dayNumber: date.getDate(),
      isToday: dateStr === todayStr,
      events: dayEvents
    })
  }

  return days
})

function getEventColor(evt: CalendarEvent): string {
  return evt.calendar?.color ?? '#10b981'
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Emit initial range
onMounted(() => {
  emitRange()
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-chevron-left"
          variant="ghost"
          size="sm"
          @click="prevWeek"
        />
        <h3 class="min-w-56 text-center text-base font-semibold text-highlighted">
          {{ weekLabel }}
        </h3>
        <UButton
          icon="i-lucide-chevron-right"
          variant="ghost"
          size="sm"
          @click="nextWeek"
        />
      </div>
      <UButton
        label="Hoje"
        variant="outline"
        size="sm"
        @click="goToToday"
      />
    </div>

    <!-- Loading -->
    <div
      v-if="loading"
      class="grid grid-cols-7 gap-2"
    >
      <USkeleton
        v-for="i in 7"
        :key="i"
        class="h-48"
      />
    </div>

    <!-- Week grid -->
    <div
      v-else
      class="grid grid-cols-7 gap-px rounded-lg border border-default overflow-hidden"
    >
      <div
        v-for="day in weekDays"
        :key="day.dateStr"
        class="min-h-48 bg-default"
        :class="day.isToday ? 'bg-primary/5' : ''"
      >
        <!-- Day header -->
        <div
          class="border-b border-default px-2 py-2 text-center"
          :class="day.isToday ? 'border-primary/30' : ''"
        >
          <span class="text-xs uppercase text-muted">{{ day.dayLabel }}</span>
          <div
            class="mt-0.5 flex items-center justify-center"
          >
            <span
              class="flex size-7 items-center justify-center rounded-full text-sm font-semibold"
              :class="day.isToday ? 'bg-primary text-white' : 'text-highlighted'"
            >
              {{ day.dayNumber }}
            </span>
          </div>
        </div>

        <!-- Events -->
        <div class="space-y-1 p-1">
          <div
            v-for="(evt, index) in day.events"
            :key="index"
            class="cursor-pointer rounded px-1.5 py-1 text-xs transition-opacity hover:opacity-80"
            :style="{ backgroundColor: getEventColor(evt) + '20', borderLeft: `3px solid ${getEventColor(evt)}` }"
            @click="emit('selectEvent', evt)"
          >
            <div class="font-medium truncate" :style="{ color: getEventColor(evt) }">
              {{ evt.title }}
            </div>
            <div
              v-if="!evt.allDay"
              class="text-muted mt-0.5"
            >
              {{ formatTime(evt.startAt) }} - {{ formatTime(evt.endAt) }}
            </div>
            <div
              v-else
              class="text-muted mt-0.5"
            >
              Dia inteiro
            </div>
          </div>

          <div
            v-if="day.events.length === 0"
            class="py-4 text-center text-xs text-muted opacity-50"
          >
            —
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
