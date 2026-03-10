<script setup lang="ts">
import type { CalendarEvent } from '~/types/appointments'

const props = defineProps<{
  events: CalendarEvent[]
  loading: boolean
  currentDate: Date
}>()

const emit = defineEmits<{
  selectEvent: [event: CalendarEvent]
  selectDate: [date: string]
  monthChange: [from: string, to: string]
  createOnDate: [date: string]
}>()

// ─── Month navigation ─────────────────────────────────────────────────────
const viewYear = ref(props.currentDate.getFullYear())
const viewMonth = ref(props.currentDate.getMonth())

const monthLabel = computed(() => {
  const date = new Date(viewYear.value, viewMonth.value, 1)
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
})

function prevMonth() {
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value--
  } else {
    viewMonth.value--
  }
  emitRange()
}

function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value++
  } else {
    viewMonth.value++
  }
  emitRange()
}

function goToToday() {
  const now = new Date()
  viewYear.value = now.getFullYear()
  viewMonth.value = now.getMonth()
  emitRange()
}

function emitRange() {
  const first = new Date(viewYear.value, viewMonth.value, 1)
  const last = new Date(viewYear.value, viewMonth.value + 1, 0)
  // Extend to cover the full calendar grid (prev month days + next month days)
  const startDay = first.getDay()
  const gridStart = new Date(first)
  gridStart.setDate(gridStart.getDate() - startDay)
  const gridEnd = new Date(last)
  const remaining = 6 - last.getDay()
  gridEnd.setDate(gridEnd.getDate() + remaining)

  emit('monthChange',
    formatDate(gridStart),
    formatDate(gridEnd)
  )
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// ─── Calendar grid ────────────────────────────────────────────────────────
const dayHeaders = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

interface DayCell {
  date: Date
  dateStr: string
  day: number
  isCurrentMonth: boolean
  isToday: boolean
  events: CalendarEvent[]
}

const calendarGrid = computed((): DayCell[][] => {
  const first = new Date(viewYear.value, viewMonth.value, 1)
  const last = new Date(viewYear.value, viewMonth.value + 1, 0)
  const startDay = first.getDay()
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const weeks: DayCell[][] = []
  const currentDate = new Date(first)
  currentDate.setDate(currentDate.getDate() - startDay)

  for (let w = 0; w < 6; w++) {
    const week: DayCell[] = []
    for (let d = 0; d < 7; d++) {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`

      const dayEvents = getDayEvents(currentDate)

      week.push({
        date: new Date(currentDate),
        dateStr,
        day: currentDate.getDate(),
        isCurrentMonth: currentDate.getMonth() === viewMonth.value,
        isToday: dateStr === todayStr,
        events: dayEvents
      })

      currentDate.setDate(currentDate.getDate() + 1)
    }
    weeks.push(week)

    // Stop if we've gone past the last day and filled the week
    if (currentDate > last && currentDate.getDay() === 0) break
  }

  return weeks
})

function getDayEvents(date: Date): CalendarEvent[] {
  if (!props.events) return []

  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)

  return props.events.filter((evt: CalendarEvent) => {
    const evtStart = new Date(evt.startAt)
    const evtEnd = new Date(evt.endAt)
    return evtStart < dayEnd && evtEnd > dayStart
  })
}

function onDayClick(cell: DayCell) {
  emit('selectDate', cell.dateStr)
}

function onEventClick(evt: CalendarEvent, e: MouseEvent) {
  e.stopPropagation()
  emit('selectEvent', evt)
}

function getEventColor(evt: CalendarEvent): string {
  return evt.calendar?.color ?? '#10b981'
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
          @click="prevMonth"
        />
        <h3 class="min-w-40 text-center text-lg font-semibold capitalize text-highlighted">
          {{ monthLabel }}
        </h3>
        <UButton
          icon="i-lucide-chevron-right"
          variant="ghost"
          size="sm"
          @click="nextMonth"
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
      class="grid grid-cols-7 gap-px"
    >
      <USkeleton
        v-for="i in 35"
        :key="i"
        class="h-24"
      />
    </div>

    <!-- Grid -->
    <div v-else>
      <!-- Day headers -->
      <div class="grid grid-cols-7 border-b border-default">
        <div
          v-for="header in dayHeaders"
          :key="header"
          class="py-2 text-center text-xs font-medium text-muted"
        >
          {{ header }}
        </div>
      </div>

      <!-- Weeks -->
      <div
        v-for="(week, wi) in calendarGrid"
        :key="wi"
        class="grid grid-cols-7 border-b border-default last:border-b-0"
      >
        <div
          v-for="cell in week"
          :key="cell.dateStr"
          class="min-h-24 cursor-pointer border-r border-default p-1 transition-colors last:border-r-0 hover:bg-elevated/50"
          :class="[
            !cell.isCurrentMonth ? 'bg-muted/5' : ''
          ]"
          @click="onDayClick(cell)"
        >
          <div class="mb-1 flex justify-end">
            <span
              class="flex size-6 items-center justify-center rounded-full text-xs"
              :class="[
                cell.isToday ? 'bg-primary text-white font-bold' : '',
                !cell.isCurrentMonth ? 'text-muted' : 'text-highlighted'
              ]"
            >
              {{ cell.day }}
            </span>
          </div>

          <!-- Events -->
          <div class="space-y-0.5">
            <div
              v-for="(evt, ei) in cell.events.slice(0, 3)"
              :key="ei"
              class="cursor-pointer truncate rounded px-1 py-0.5 text-xs text-white"
              :style="{ backgroundColor: getEventColor(evt) }"
              @click="onEventClick(evt, $event)"
            >
              {{ evt.allDay ? '' : new Date(evt.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ' ' }}{{ evt.title }}
            </div>
            <div
              v-if="cell.events.length > 3"
              class="px-1 text-xs text-muted"
            >
              +{{ cell.events.length - 3 }} mais
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
