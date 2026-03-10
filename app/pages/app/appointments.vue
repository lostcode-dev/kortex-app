<script setup lang="ts">
import type { CalendarEvent } from '~/types/appointments'

definePageMeta({
  layout: 'app'
})

useSeoMeta({
  title: 'Compromissos'
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
  refreshEvents
} = useAppointments()

// ─── Active tab ───────────────────────────────────────────────────────────
const activeTab = ref('month')

const tabItems = [
  { label: 'Mês', value: 'month', icon: 'i-lucide-calendar' },
  { label: 'Semana', value: 'week', icon: 'i-lucide-calendar-days' },
  { label: 'Agenda', value: 'agenda', icon: 'i-lucide-list' }
]

// ─── Modals / Slideover ───────────────────────────────────────────────────
const calendarCreateOpen = ref(false)
const eventCreateOpen = ref(false)
const eventDetailOpen = ref(false)
const eventDetailLoading = ref(false)
const calendarsExpanded = ref(false)
const selectedEvent = ref<CalendarEvent | null>(null)

const selectedCalendarId = computed(() => activeCalendarIds.value[0] ?? '')

async function onSelectEvent(evt: CalendarEvent) {
  selectedEvent.value = evt
  eventDetailOpen.value = true

  eventDetailLoading.value = true

  try {
    const detailedEvent = await fetchEventDetail(evt.id)

    if (detailedEvent && selectedEvent.value?.id === evt.id) {
      selectedEvent.value = {
        ...detailedEvent,
        recurrenceId: evt.recurrenceId ?? detailedEvent.recurrenceId ?? null,
        isRecurring: evt.isRecurring ?? detailedEvent.isRecurring,
        isCancelled: evt.isCancelled ?? detailedEvent.isCancelled
      }
    }
  } finally {
    eventDetailLoading.value = false
  }
}

function onMonthChange(from: string, to: string) {
  setViewRange(from, to)
}

function onWeekChange(from: string, to: string) {
  setViewRange(from, to)
}

function onSelectDate(_date: string) {
  // Could open a day view or create event — for now just switch to agenda
  activeTab.value = 'agenda'
}

function toggleCalendarsPanel() {
  calendarsExpanded.value = !calendarsExpanded.value
}

function onToggleCalendar(calendarId: string) {
  activeCalendarIds.value = selectedCalendarId.value === calendarId ? [] : [calendarId]
}

const currentDate = new Date()

const eventsList = computed(() => eventsData.value?.data ?? [])

onMounted(() => {
  refreshCalendars()
})
</script>

<template>
  <UDashboardPanel id="appointments">
    <template #header>
      <UDashboardNavbar title="Agendamentos">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <NotificationsButton />
          <UButton
            :label="calendarsExpanded ? 'Ocultar calendários' : 'Calendários'"
            icon="i-lucide-panel-left"
            variant="outline"
            @click="toggleCalendarsPanel"
          />
          <UInput
            v-model="searchQuery"
            placeholder="Buscar eventos..."
            icon="i-lucide-search"
            class="w-48"
          />
          <UButton
            label="Novo evento"
            icon="i-lucide-plus"
            @click="eventCreateOpen = true"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex h-full flex-col gap-4 p-4 sm:p-6 lg:flex-row lg:gap-6">
        <!-- Sidebar: Calendar list -->
        <div
          v-if="calendarsExpanded"
          class="w-full shrink-0 lg:w-64 xl:w-72"
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

        <!-- Main content -->
        <div class="min-w-0 flex-1">
          <UTabs
            v-model="activeTab"
            :items="tabItems"
            class="mb-4"
          />

          <!-- Month view -->
          <AppointmentsMonthView
            v-if="activeTab === 'month'"
            :events="eventsList"
            :loading="eventsStatus === 'pending'"
            :current-date="currentDate"
            @select-event="onSelectEvent"
            @select-date="onSelectDate"
            @month-change="onMonthChange"
            @create-on-date="() => { eventCreateOpen = true }"
          />

          <!-- Week view -->
          <AppointmentsWeekView
            v-if="activeTab === 'week'"
            :events="eventsList"
            :loading="eventsStatus === 'pending'"
            :current-date="currentDate"
            @select-event="onSelectEvent"
            @week-change="onWeekChange"
          />

          <!-- Agenda view -->
          <AppointmentsAgendaView
            v-if="activeTab === 'agenda'"
            :events="eventsList"
            :loading="eventsStatus === 'pending'"
            @select-event="onSelectEvent"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Modals -->
  <AppointmentsCalendarCreateModal
    :open="calendarCreateOpen"
    :calendars="calendars"
    @update:open="calendarCreateOpen = $event"
    @created="() => {}"
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
-->