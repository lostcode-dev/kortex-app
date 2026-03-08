import { useDebounceFn } from '@vueuse/core'
import type {
  CalendarDay,
  CreateHabitPayload,
  CreateHabitStackPayload,
  CreateIdentityPayload,
  CreateReflectionPayload,
  HabitChangeHistory,
  HabitInsights,
  HabitListResponse,
  HabitReflection,
  HabitStack,
  HabitTreeSyncNode,
  Identity,
  LogHabitPayload,
  TodayHabitsResponse,
  UpdateHabitPayload,
  Habit
} from '~/types/habits'
import { HabitDifficulty, HabitFrequency, HabitType } from '~/types/habits'

export function useHabits() {
  const toast = useToast()

  // ─── Today habits ────────────────────────────────────────────────────────────
  const todayDate = ref(new Date().toISOString().split('T')[0])

  const {
    data: todayData,
    status: todayStatus,
    refresh: refreshToday
  } = useFetch<TodayHabitsResponse>('/api/habits/today', {
    query: { date: todayDate },
    lazy: true,
    immediate: false,
    key: 'habits-today'
  })

  // ─── Habits list (paginated) ────────────────────────────────────────────────
  const listPage = ref(1)
  const listPageSize = ref(20)
  const listSearch = ref('')
  const listFrequency = ref<string>('')
  const listDifficulty = ref<string>('')
  const listIdentityId = ref<string>('')
  const listArchived = ref(false)

  const {
    data: listData,
    status: listStatus,
    refresh: refreshList
  } = useFetch<HabitListResponse>('/api/habits', {
    query: computed(() => ({
      page: listPage.value,
      pageSize: listPageSize.value,
      search: listSearch.value || undefined,
      frequency: listFrequency.value || undefined,
      difficulty: listDifficulty.value || undefined,
      identityId: listIdentityId.value || undefined,
      archived: listArchived.value
    })),
    lazy: true,
    immediate: false,
    key: 'habits-list',
    watch: [listPage, listPageSize, listFrequency, listDifficulty, listIdentityId, listArchived]
  })

  const debouncedRefreshList = useDebounceFn(() => {
    refreshList()
  }, 300)

  watch(listSearch, () => {
    listPage.value = 1
    debouncedRefreshList()
  })

  // ─── Identities ─────────────────────────────────────────────────────────────
  const {
    data: identities,
    status: identitiesStatus,
    refresh: refreshIdentities
  } = useFetch<Identity[]>('/api/habits/identities', {
    lazy: true,
    immediate: false,
    key: 'habits-identities'
  })

  // ─── Insights ───────────────────────────────────────────────────────────────
  const {
    data: insights,
    status: insightsStatus,
    refresh: refreshInsights
  } = useFetch<HabitInsights>('/api/habits/insights', {
    lazy: true,
    immediate: false,
    key: 'habits-insights'
  })

  // ─── Actions ────────────────────────────────────────────────────────────────

  async function createHabit(payload: CreateHabitPayload): Promise<Habit | null> {
    try {
      const habit = await $fetch<Habit>('/api/habits', {
        method: 'POST',
        body: payload
      })
      toast.add({ title: 'Hábito criado', description: `"${habit.name}" adicionado com sucesso.`, color: 'success' })
      await Promise.all([refreshToday(), refreshList()])
      return habit
    } catch {
      toast.add({ title: 'Erro', description: 'Não foi possível criar o hábito.', color: 'error' })
      return null
    }
  }

  async function updateHabit(id: string, payload: UpdateHabitPayload): Promise<Habit | null> {
    try {
      const habit = await $fetch<Habit>(`/api/habits/${id}`, {
        method: 'PUT',
        body: payload
      })
      toast.add({ title: 'Hábito atualizado', description: `"${habit.name}" salvo com sucesso.`, color: 'success' })
      await Promise.all([refreshToday(), refreshList()])
      return habit
    } catch {
      toast.add({ title: 'Erro', description: 'Não foi possível atualizar o hábito.', color: 'error' })
      return null
    }
  }

  async function archiveHabit(id: string, name: string): Promise<boolean> {
    try {
      await $fetch(`/api/habits/${id}`, { method: 'DELETE' })
      toast.add({ title: 'Hábito arquivado', description: `"${name}" foi arquivado.`, color: 'success' })
      await Promise.all([refreshToday(), refreshList()])
      return true
    } catch {
      toast.add({ title: 'Erro', description: 'Não foi possível arquivar o hábito.', color: 'error' })
      return false
    }
  }

  async function restoreHabit(id: string): Promise<boolean> {
    try {
      await $fetch(`/api/habits/${id}/restore`, { method: 'POST' })
      toast.add({ title: 'Hábito restaurado', description: 'O hábito foi restaurado com sucesso.', color: 'success' })
      await Promise.all([refreshToday(), refreshList()])
      return true
    } catch {
      toast.add({ title: 'Erro', description: 'Não foi possível restaurar o hábito.', color: 'error' })
      return false
    }
  }

  async function logHabit(payload: LogHabitPayload): Promise<boolean> {
    try {
      await $fetch('/api/habits/log', {
        method: 'POST',
        body: payload
      })
      if (payload.completed) {
        toast.add({ title: 'Muito bem!', description: 'Você está construindo consistência.', color: 'success' })
      }
      await refreshToday()
      return true
    } catch {
      toast.add({ title: 'Erro', description: 'Não foi possível registrar o hábito.', color: 'error' })
      return false
    }
  }

  async function createIdentity(payload: CreateIdentityPayload): Promise<Identity | null> {
    try {
      const identity = await $fetch<Identity>('/api/habits/identities', {
        method: 'POST',
        body: payload
      })
      toast.add({ title: 'Identidade criada', description: `"${identity.name}" criada com sucesso.`, color: 'success' })
      await refreshIdentities()
      return identity
    } catch {
      toast.add({ title: 'Erro', description: 'Não foi possível criar a identidade.', color: 'error' })
      return null
    }
  }

  async function archiveIdentity(id: string, name: string): Promise<boolean> {
    try {
      await $fetch(`/api/habits/identities/${id}`, { method: 'DELETE' })
      toast.add({ title: 'Identidade arquivada', description: `"${name}" foi arquivada.`, color: 'success' })

      if (listIdentityId.value === id) {
        listIdentityId.value = ''
      }

      await Promise.all([refreshIdentities(), refreshList()])
      return true
    } catch {
      toast.add({ title: 'Erro', description: 'Não foi possível arquivar a identidade.', color: 'error' })
      return false
    }
  }

  async function saveReflection(payload: CreateReflectionPayload): Promise<HabitReflection | null> {
    try {
      const reflection = await $fetch<HabitReflection>('/api/habits/reflections', {
        method: 'POST',
        body: payload
      })
      toast.add({ title: 'Reflexão salva', description: 'Sua revisão semanal foi salva.', color: 'success' })
      return reflection
    } catch {
      toast.add({ title: 'Erro', description: 'Não foi possível salvar a reflexão.', color: 'error' })
      return null
    }
  }

  async function fetchCalendar(habitId: string, year: number, month: number): Promise<CalendarDay[]> {
    try {
      return await $fetch<CalendarDay[]>(`/api/habits/${habitId}/calendar`, {
        query: { year, month }
      })
    } catch {
      toast.add({ title: 'Erro', description: 'Não foi possível carregar o calendário.', color: 'error' })
      return []
    }
  }

  async function fetchHabit(id: string): Promise<Habit | null> {
    try {
      return await $fetch<Habit>(`/api/habits/${id}`)
    } catch {
      toast.add({ title: 'Erro', description: 'Hábito não encontrado.', color: 'error' })
      return null
    }
  }

  async function fetchHistory(habitId: string, page = 1): Promise<HabitChangeHistory[]> {
    try {
      return await $fetch<HabitChangeHistory[]>(`/api/habits/${habitId}/history`, {
        query: { page, pageSize: 20 }
      })
    } catch {
      toast.add({ title: 'Erro', description: 'Não foi possível carregar o histórico.', color: 'error' })
      return []
    }
  }

  // ─── Habit Stacks ─────────────────────────────────────────────────────────

  const {
    data: stacks,
    status: stacksStatus,
    refresh: refreshStacks
  } = useFetch<HabitStack[]>('/api/habits/stacks', {
    lazy: true,
    immediate: false,
    key: 'habits-stacks'
  })

  async function createStack(payload: CreateHabitStackPayload): Promise<HabitStack | null> {
    try {
      const stack = await $fetch<HabitStack>('/api/habits/stacks', {
        method: 'POST',
        body: payload
      })
      toast.add({ title: 'Empilhamento criado', description: 'Gatilho de hábito adicionado com sucesso.', color: 'success' })
      await Promise.all([refreshStacks(), refreshToday(), refreshList()])
      return stack
    } catch {
      toast.add({ title: 'Erro', description: 'Não foi possível criar o empilhamento.', color: 'error' })
      return null
    }
  }

  async function removeStack(id: string): Promise<boolean> {
    try {
      await $fetch(`/api/habits/stacks/${id}`, { method: 'DELETE' })
      toast.add({ title: 'Empilhamento removido', description: 'Gatilho removido com sucesso.', color: 'success' })
      await Promise.all([refreshStacks(), refreshToday(), refreshList()])
      return true
    } catch {
      toast.add({ title: 'Erro', description: 'Não foi possível remover o empilhamento.', color: 'error' })
      return false
    }
  }

  async function removeStacksByTrigger(triggerHabitId: string, habitName: string): Promise<boolean> {
    try {
      const result = await $fetch<{ success: boolean; removedCount: number }>(`/api/habits/stacks/trigger/${triggerHabitId}`, {
        method: 'DELETE'
      })

      toast.add({
        title: 'Empilhamentos removidos',
        description: result.removedCount > 0
          ? `Os empilhamentos de "${habitName}" foram removidos.`
          : `"${habitName}" não tinha empilhamentos ativos.`,
        color: 'success'
      })

      await Promise.all([refreshStacks(), refreshToday(), refreshList()])
      return true
    } catch {
      toast.add({ title: 'Erro', description: 'Não foi possível remover os empilhamentos.', color: 'error' })
      return false
    }
  }

  async function syncHabitTree(nodes: HabitTreeSyncNode[]): Promise<boolean> {
    try {
      await $fetch('/api/habits/tree', {
        method: 'PUT',
        body: { nodes }
      })

      toast.add({
        title: 'Árvore atualizada',
        description: 'A ordem e os empilhamentos dos hábitos foram sincronizados.',
        color: 'success'
      })

      await Promise.all([refreshStacks(), refreshToday(), refreshList(), refreshInsights()])
      return true
    } catch {
      toast.add({
        title: 'Erro',
        description: 'Não foi possível sincronizar a árvore de hábitos.',
        color: 'error'
      })
      return false
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const frequencyOptions = [
    { label: 'Diário', value: HabitFrequency.Daily },
    { label: 'Semanal', value: HabitFrequency.Weekly },
    { label: 'Personalizado', value: HabitFrequency.Custom }
  ]

  const difficultyOptions = [
    { label: 'Pequeno', value: HabitDifficulty.Tiny },
    { label: 'Normal', value: HabitDifficulty.Normal },
    { label: 'Difícil', value: HabitDifficulty.Hard }
  ]

  const habitTypeOptions = [
    { label: 'Positivo', value: HabitType.Positive },
    { label: 'Negativo', value: HabitType.Negative }
  ]

  const dayOptions = [
    { label: 'Dom', value: 0 },
    { label: 'Seg', value: 1 },
    { label: 'Ter', value: 2 },
    { label: 'Qua', value: 3 },
    { label: 'Qui', value: 4 },
    { label: 'Sex', value: 5 },
    { label: 'Sáb', value: 6 }
  ]

  function getCurrentWeekKey(): string {
    const now = new Date()
    const oneJan = new Date(now.getFullYear(), 0, 1)
    const days = Math.floor((now.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000))
    const weekNumber = Math.ceil((days + oneJan.getDay() + 1) / 7)
    return `${now.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`
  }

  return {
    // Today
    todayData,
    todayStatus,
    todayDate,
    refreshToday,
    // List
    listData,
    listStatus,
    listPage,
    listPageSize,
    listSearch,
    listFrequency,
    listDifficulty,
    listIdentityId,
    listArchived,
    refreshList,
    // Identities
    identities,
    identitiesStatus,
    refreshIdentities,
    // Insights
    insights,
    insightsStatus,
    refreshInsights,
    // Actions
    createHabit,
    updateHabit,
    archiveHabit,
    restoreHabit,
    logHabit,
    createIdentity,
    archiveIdentity,
    saveReflection,
    fetchCalendar,
    fetchHabit,
    fetchHistory,
    // Stacks
    stacks,
    stacksStatus,
    refreshStacks,
    createStack,
    removeStack,
    removeStacksByTrigger,
    syncHabitTree,
    // Helpers
    frequencyOptions,
    difficultyOptions,
    habitTypeOptions,
    dayOptions,
    getCurrentWeekKey
  }
}
