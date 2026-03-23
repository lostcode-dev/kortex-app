import { useDebounceFn } from '@vueuse/core'
import type {
  GoalInsights,
  GoalListResponse,
} from '~/types/goals'
import { useGoalActions } from '~/composables/useGoalActions'

export function useGoals() {
  // ─── Goals list (paginated) ─────────────────────────────────────────────────
  const listPage = ref(1)
  const listPageSize = ref(20)
  const listSearch = ref('')
  const listStatus = ref<string>('')
  const listTimeCategory = ref<string>('')
  const listLifeCategory = ref<string>('')

  const {
    data: listData,
    status: listFetchStatus,
    refresh: refreshList
  } = useFetch<GoalListResponse>('/api/goals', {
    query: computed(() => ({
      page: listPage.value,
      pageSize: listPageSize.value,
      search: listSearch.value || undefined,
      status: listStatus.value || undefined,
      timeCategory: listTimeCategory.value || undefined,
      lifeCategory: listLifeCategory.value || undefined
    })),
    lazy: true,
    immediate: false,
    key: 'goals-list',
    watch: [listPage, listPageSize, listStatus, listTimeCategory, listLifeCategory]
  })

  const debouncedRefreshList = useDebounceFn(() => {
    refreshList()
  }, 300)

  watch(listSearch, () => {
    listPage.value = 1
    debouncedRefreshList()
  })

  // ─── Insights ───────────────────────────────────────────────────────────────
  const {
    data: insights,
    status: insightsStatus,
    refresh: refreshInsights
  } = useFetch<GoalInsights>('/api/goals/insights', {
    lazy: true,
    immediate: false,
    key: 'goals-insights'
  })

  const actions = useGoalActions()

  return {
    // List
    listData,
    listFetchStatus,
    listPage,
    listPageSize,
    listSearch,
    listStatus,
    listTimeCategory,
    listLifeCategory,
    refreshList,
    // Insights
    insights,
    insightsStatus,
    refreshInsights,
    // Actions & Helpers
    ...actions,
  }
}
