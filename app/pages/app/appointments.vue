<script setup lang="ts">
import type { CalendarEvent, CreateEventPayload } from '~/types/appointments'

definePageMeta({
  layout: 'app'
})

useSeoMeta({
  title: 'Agenda'
})

const {
  calendars,
  calendarsStatus,
  eventsData,
  eventsStatus,
  searchQuery,
  activeCalendarIds,
  setViewRange,
  fetchEventDetail,
  refreshCalendars,
  refreshEvents,
  createEvent,
  archiveEvent
} = useAppointments()

// ─── View mode (Day / Week / Month) ─────────────────────────────────────
type CalendarViewMode = 'day' | 'week' | 'month'

const STORAGE_KEY = 'sb-calendar-view'
const savedView = (typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null) as CalendarViewMode | null
const activeView = ref<CalendarViewMode>(savedView && ['day', 'week', 'month'].includes(savedView) ? savedView : 'month')

watch(activeView, (v) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, v)
  }
})

const viewModes: { label: string, value: CalendarViewMode, icon: string }[] = [
  { label: 'Dia', value: 'day', icon: 'i-lucide-calendar' },
  { label: 'Semana', value: 'week', icon: 'i-lucide-calendar-days' },
  { label: 'Mês', value: 'month', icon: 'i-lucide-grid-3x3' }
]

// ─── Navigation state ───────────────────────────────────────────────────
const today = new Date()
const viewYear = ref(today.getFullYear())
const viewMonth = ref(today.getMonth())
const viewWeekStart = ref(getWeekStart(today))
const viewDayDate = ref(new Date(today))

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

const headerLabel = computed(() => {
  if (activeView.value === 'month') {
    const d = new Date(viewYear.value, viewMonth.value, 1)
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  }
  if (activeView.value === 'week') {
    const start = viewWeekStart.value
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    const sStr = start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    const eStr = end.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    return `${sStr} — ${eStr}`
  }
  return viewDayDate.value.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
})

function goPrev() {
  if (activeView.value === 'month') {
    if (viewMonth.value === 0) {
      viewMonth.value = 11
      viewYear.value--
    } else {
      viewMonth.value--
    }
  } else if (activeView.value === 'week') {
    const d = new Date(viewWeekStart.value)
    d.setDate(d.getDate() - 7)
    viewWeekStart.value = d
  } else {
    const d = new Date(viewDayDate.value)
    d.setDate(d.getDate() - 1)
    viewDayDate.value = d
  }
}

function goNext() {
  if (activeView.value === 'month') {
    if (viewMonth.value === 11) {
      viewMonth.value = 0
      viewYear.value++
    } else {
      viewMonth.value++
    }
  } else if (activeView.value === 'week') {
    const d = new Date(viewWeekStart.value)
    d.setDate(d.getDate() + 7)
    viewWeekStart.value = d
  } else {
    const d = new Date(viewDayDate.value)
    d.setDate(d.getDate() + 1)
    viewDayDate.value = d
  }
}

function goToday() {
  const now = new Date()
  viewYear.value = now.getFullYear()
  viewMonth.value = now.getMonth()
  viewWeekStart.value = getWeekStart(now)
  viewDayDate.value = new Date(now)
}

// ─── Modals / Popovers ─────────────────────────────────────────────────
const calendarCreateOpen = ref(false)
const eventCreateOpen = ref(false)
const eventDetailOpen = ref(false)
const eventDetailLoading = ref(false)
const calendarsExpanded = ref(false)
const selectedEvent = ref<CalendarEvent | null>(null)

// Event popover state
const eventPopoverVisible = ref(false)
const eventPopoverEvent = ref<CalendarEvent | null>(null)
const eventPopoverPosition = ref({ x: 0, y: 0 })

// Quick create popover state
const quickCreateVisible = ref(false)
const quickCreateDate = ref('')
const quickCreatePosition = ref({ x: 0, y: 0 })

const selectedCalendarId = computed(() => activeCalendarIds.value[0] ?? '')

function onSelectEvent(evt: CalendarEvent, mouseEvent: MouseEvent) {
  // Close quick create if open
  quickCreateVisible.value = false

  eventPopoverEvent.value = evt
  eventPopoverPosition.value = { x: mouseEvent.clientX, y: mouseEvent.clientY }
  eventPopoverVisible.value = true
}

function onSelectSlot(date: string, mouseEvent: MouseEvent) {
  // Close event popover if open
  eventPopoverVisible.value = false

  quickCreateDate.value = date
  quickCreatePosition.value = { x: mouseEvent.clientX, y: mouseEvent.clientY }
  quickCreateVisible.value = true
}

function onDaySlotSelect(_date: string, time: string, mouseEvent: MouseEvent) {
  eventPopoverVisible.value = false
  quickCreateDate.value = _date
  quickCreatePosition.value = { x: mouseEvent.clientX, y: mouseEvent.clientY }
  quickCreateVisible.value = true
}

function closeEventPopover() {
  eventPopoverVisible.value = false
  eventPopoverEvent.value = null
}

function closeQuickCreate() {
  quickCreateVisible.value = false
}

async function onPopoverEdit(evt: CalendarEvent) {
  closeEventPopover()
  selectedEvent.value = evt
  eventDetailOpen.value = true
  eventDetailLoading.value = true

  try {
    const detail = await fetchEventDetail(evt.id)
    if (detail && selectedEvent.value?.id === evt.id) {
      selectedEvent.value = {
        ...detail,
        recurrenceId: evt.recurrenceId ?? detail.recurrenceId ?? null,
        isRecurring: evt.isRecurring ?? detail.isRecurring,
        isCancelled: evt.isCancelled ?? detail.isCancelled
      }
    }
  } finally {
    eventDetailLoading.value = false
  }
}

async function onPopoverArchive(evt: CalendarEvent) {
  closeEventPopover()
  const success = await archiveEvent(evt.id)
  if (success) {
    refreshEvents()
  }
}

async function onPopoverDuplicate(evt: CalendarEvent) {
  closeEventPopover()
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  const payload: CreateEventPayload = {
    calendarId: evt.calendarId,
    title: `${evt.title} (cópia)`,
    description: evt.description ?? undefined,
    location: evt.location ?? undefined,
    startAt: evt.startAt,
    endAt: evt.endAt,
    eventTimezone: evt.eventTimezone || timezone,
    allDay: evt.allDay,
    rrule: evt.rrule ?? undefined
  }

  const result = await createEvent(payload)
  if (result) {
    refreshEvents()
  }
}

async function onQuickCreate(data: { title: string, date: string, calendarId: string }) {
  closeQuickCreate()
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const startAt = `${data.date}T09:00:00`
  const endAt = `${data.date}T10:00:00`

  const payload: CreateEventPayload = {
    calendarId: data.calendarId,
    title: data.title,
    startAt: new Date(startAt).toISOString(),
    endAt: new Date(endAt).toISOString(),
    eventTimezone: timezone
  }

  const result = await createEvent(payload)
  if (result) {
    refreshEvents()
  }
}

function onQuickCreateMoreOptions(_date: string) {
  closeQuickCreate()
  eventCreateOpen.value = true
}

function onMonthChange(from: string, to: string) {
  setViewRange(from, to)
}

function onWeekChange(from: string, to: string) {
  setViewRange(from, to)
}

function onDayChange(from: string, to: string) {
  setViewRange(from, to)
}

function toggleCalendarsPanel() {
  calendarsExpanded.value = !calendarsExpanded.value
}

function onToggleCalendar(calendarId: string) {
  activeCalendarIds.value = selectedCalendarId.value === calendarId ? [] : [calendarId]
}

const eventsList = computed(() => eventsData.value?.data ?? [])

onMounted(() => {
  refreshCalendars()
})
</script>

<template>
  <UDashboardPanel id="appointments">
    <template #header>
      <UDashboardNavbar title="Agenda">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #default>
          <!-- Google Calendar-style toolbar -->
          <div class="flex w-full items-center gap-2">
            <!-- Today + Nav arrows -->
            <UButton
              label="Hoje"
              variant="outline"
              size="sm"
              @click="goToday"
            />
            <UButton
              icon="i-lucide-chevron-left"
              variant="ghost"
              size="sm"
              @click="goPrev"
            />
            <UButton
              icon="i-lucide-chevron-right"
              variant="ghost"
              size="sm"
              @click="goNext"
            />

            <!-- Current period label -->
            <h2 class="min-w-44 text-base font-semibold capitalize text-highlighted">
              {{ headerLabel }}
            </h2>

            <div class="flex-1" />

            <!-- Search -->
            <UInput
              v-model="searchQuery"
              placeholder="Buscar..."
              icon="i-lucide-search"
              size="sm"
              class="w-40"
            />

            <!-- View mode switcher -->
            <div class="flex items-center rounded-md border border-default">
              <button
                v-for="mode in viewModes"
                :key="mode.value"
                type="button"
                class="px-2.5 py-1 text-xs font-medium transition-colors first:rounded-l-md last:rounded-r-md"
                :class="activeView === mode.value
                  ? 'bg-primary text-white'
                  : 'text-muted hover:bg-elevated/50'"
                @click="activeView = mode.value"
              >
                {{ mode.label }}
              </button>
            </div>

            <!-- Calendar list toggle -->
            <UButton
              icon="i-lucide-panel-left"
              variant="ghost"
              size="sm"
              :class="calendarsExpanded ? 'text-primary' : ''"
              @click="toggleCalendarsPanel"
            />

            <!-- Notifications -->
            <NotificationsButton />

            <!-- New event -->
            <UButton
              icon="i-lucide-plus"
              size="sm"
              @click="eventCreateOpen = true"
            />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex h-full">
        <!-- Sidebar: Calendar list -->
        <div
          v-if="calendarsExpanded"
          class="w-56 shrink-0 border-r border-default p-3 overflow-y-auto"
        >
          <AppointmentsCalendarList
            :calendars="calendars"
            :loading="calendarsStatus === 'pending'"
            :active-calendar-id="selectedCalendarId"
            @create="calendarCreateOpen = true"
            @toggle="onToggleCalendar"
            @archive="() => {}"
            @edit="() => {}"
          />
        </div>

        <!-- Main calendar area -->
        <div class="min-w-0 flex-1 overflow-auto p-2">
          <!-- Month view -->
          <AppointmentsMonthView
            v-if="activeView === 'month'"
            :events="eventsList"
            :loading="eventsStatus === 'pending'"
            :current-date="new Date()"
            :view-year="viewYear"
            :view-month="viewMonth"
            @select-event="onSelectEvent"
            @select-slot="onSelectSlot"
            @month-change="onMonthChange"
          />

          <!-- Week view -->
          <AppointmentsWeekView
            v-if="activeView === 'week'"
            :events="eventsList"
            :loading="eventsStatus === 'pending'"
            :week-start-date="viewWeekStart"
            @select-event="onSelectEvent"
            @select-slot="onSelectSlot"
            @week-change="onWeekChange"
          />

          <!-- Day view -->
          <AppointmentsDayView
            v-if="activeView === 'day'"
            :events="eventsList"
            :loading="eventsStatus === 'pending'"
            :current-date="viewDayDate"
            @select-event="onSelectEvent"
            @select-slot="onDaySlotSelect"
            @day-change="onDayChange"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Event popover (Google Calendar style) -->
  <AppointmentsEventPopover
    :event="eventPopoverEvent"
    :position="eventPopoverPosition"
    :visible="eventPopoverVisible"
    @close="closeEventPopover"
    @edit="onPopoverEdit"
    @archive="onPopoverArchive"
    @duplicate="onPopoverDuplicate"
  />

  <!-- Quick create popover -->
  <AppointmentsQuickCreatePopover
    :visible="quickCreateVisible"
    :position="quickCreatePosition"
    :date="quickCreateDate"
    :calendars="calendars"
    @close="closeQuickCreate"
    @create="onQuickCreate"
    @more-options="onQuickCreateMoreOptions"
  />

  <!-- Modals -->
  <AppointmentsCalendarCreateModal
    :open="calendarCreateOpen"
    :calendars="calendars"
    @update:open="calendarCreateOpen = $event"
    @created="refreshCalendars"
  />

  <AppointmentsEventCreateModal
    :open="eventCreateOpen"
    :calendars="calendars"
    @update:open="eventCreateOpen = $event"
    @created="refreshEvents"
  />

  <AppointmentsEventDetailSlideover
    :open="eventDetailOpen"
    :event="selectedEvent"
    :loading="eventDetailLoading"
    :calendars="calendars"
    @update:open="eventDetailOpen = $event"
    @updated="refreshEvents"
    @archived="refreshEvents"
  />
</template>

<!--
  TO DO:
  - Quando abre a página está fazendo vários requests, deve otimizar porque não precisa iniciar fazendo requests repetidas.
  - Na tab de Agenda, deveria ser possível editar todo o evento quando clicko para editar o evento, e também exibir todas as informações.
  - Na tab de Agenda, está exibindo invalid date, deve corrigir para exibir a data corretamente.
  - Na tab de Mês, apesar de trazer as respostas, não está exibindo os eventos, deve corrigir para exibir os eventos corretamente.
  - Na tab de semana, apesar de trazer as respostas, não está exibindo os eventos, deve corrigir para exibir os eventos corretamente.
  - A parte de Calendários, está ocupando muito espaço, deve ser colapsada por padrão, e expandida apenas quando o usuário quiser, para otimizar o espaço da tela.
  - Qando clicko no calendário, deve ficar ativo e exibir os eventos relacionados a ele, deve corrigir para exibir os eventos relacionados ao calendário selecionado.
  - Quando clicko no calendário, deve tirar a seleção de selecionado, e exibir para todos, basicamente posso selecionar um por vez, e sem seleção seleciona todos.

  - Deve ficar armazenado o histórico dos eventos para poder exibir dados do passado, no caso de alteração.
  - Não precisa exibir as 3 Tabs, porque todo o gerenciamento deve ser feita no calendário principal.
  - Deve ser possível mudar a view do calendário (Dia, Semana, Mês) e ficar armazenado para a próxima vez que acessar, para otimizar a experiência do usuário.
  - Quando clicko em um evento, deve abrir um "HoverCard", que nem no Google Calendar, com as informações do agendamento, com o btn de editar, remover, duplicar.
  - Quando clicko em um espaço vazio do calendário, deve abrir um "HoverCard" para criar um novo evento, com a data já preenchida, para otimizar a criação de eventos.
  - Deve seguir o padrão do Google Calendar, para otimizar a experiência do usuário, porque já estão acostumados com aquele padrão.
  - Deve seguir o padrão do Google Calendar, para otimizar a experiência do usuário, porque já estão acostumados com aquele padrão, principamente no mode visualizar os eventos.
  - Sidebar lateral de navegação, do menu, deve ser colapsada por padrão, e expandida apenas quando o usuário quiser, para otimizar o espaço da tela, ou quando colocar o mouse em cima.

  - Hábitos que tem hora marcada, deve aparecer na agenda, e deve ser possível marcar como feito, ou não feito, para otimizar o acompanhamento dos hábitos.
  - Deve ser possível arrastar e soltar os eventos para mudar a data, ou horário, para otimizar a edição dos eventos.
  - Deve ser possível alterar o horário do hábito no dia que tem hora marcada, para otimizar o acompanhamento dos hábitos.
  - Hábitos que não tem hora marcada, deve exibir que nem tarefas que existe no Google Calendar, que ficam no topo do dia, para otimizar a visualização dos hábitos.
  - Se o Hábito estiver empilhado e o primeiro hábito tem horário, deve empilhar os outros hábitos embaixo, e exibir o horário do primeiro hábito, para otimizar a visualização dos hábitos, mesmo que os outros não tenham hora marcada.
  - Quando estou mudando o dia, não está atualizando os eventos, para exibir os dados do dia.
  - Em semana deve ter um layout semelhante ao Google Calendar, para otimizar a experiência do usuário, que nem o Dia, que exibe o horário na lateral esquerda.
  - Quanto tento duplicar um evento, está dando erro 500, deve corrigir para duplicar o evento corretamente.
  - Quando clicko em um espaço vazio do calendário, no modo dia, deve pegar o horário do dia clicado, para otimizar a criação de eventos.
  - Quando clicko em um epsço vazio, deve ficar fácil a seleção da data, para otimizar a criação de eventos, principalmente no modo semana e mês, onde tem muitos dias.
  - Devemos considerar o hábito como um calendário, então deve aparecer a opção onde filtra por calendário, para otimizar a visualização dos hábitos, e conseguir ver somente os hábitos no calendário.
  - Deve ter uma cor específica para os hábitos, uma cor que não pode ser selecionada na criação de calendários, para otimizar a identificação visual dos hábitos no calendário. 
-->

