import { z } from 'zod'
import { getSupabaseAdminClient } from '../../utils/supabase'
import { requireAuthUser } from '../../utils/require-auth'
import { expandRecurrence } from '../../utils/recurrence'

const querySchema = z.object({
  calendarId: z.string().uuid().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50)
})

export default eventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const query = getQuery(event)
  const params = querySchema.parse(query)
  const rangeStart = params.from ? new Date(`${params.from}T00:00:00.000`) : null
  const rangeEnd = params.to ? new Date(`${params.to}T23:59:59.999`) : null
  const rangeStartIso = rangeStart?.toISOString()
  const rangeEndIso = rangeEnd?.toISOString()

  const supabase = getSupabaseAdminClient()

  // First get user's calendar IDs
  let calendarIds: string[] = []
  if (params.calendarId) {
    calendarIds = [params.calendarId]
  } else {
    const { data: cals } = await supabase
      .from('calendars')
      .select('id')
      .eq('owner_user_id', user.id)
      .is('archived_at', null)

    calendarIds = (cals ?? []).map((c: Record<string, unknown>) => c.id as string)
  }

  if (calendarIds.length === 0) {
    return { data: [], total: 0, page: params.page, pageSize: params.pageSize }
  }

  // Fetch non-recurring events in range
  let queryBuilder = supabase
    .from('events')
    .select('*, calendars!inner(id, name, color)', { count: 'exact' })
    .in('calendar_id', calendarIds)
    .is('archived_at', null)

  if (rangeStartIso) {
    queryBuilder = queryBuilder.gte('end_at', rangeStartIso)
  }
  if (rangeEndIso) {
    queryBuilder = queryBuilder.lte('start_at', rangeEndIso)
  }
  if (params.q) {
    queryBuilder = queryBuilder.or(`title.ilike.%${params.q}%,description.ilike.%${params.q}%,location.ilike.%${params.q}%`)
  }

  queryBuilder = queryBuilder.order('start_at', { ascending: true })

  const { page, pageSize } = params
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  queryBuilder = queryBuilder.range(from, to)

  const { data, count, error } = await queryBuilder

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  // For recurring events, also fetch exceptions
  const events = data ?? []
  const recurringEventIds = events
    .filter((e: Record<string, unknown>) => e.rrule)
    .map((e: Record<string, unknown>) => e.id as string)

  let exceptions: Record<string, unknown>[] = []
  if (recurringEventIds.length > 0) {
    const { data: exData } = await supabase
      .from('event_exceptions')
      .select('*')
      .in('event_id', recurringEventIds)

    exceptions = exData ?? []
  }

  // Expand recurring events within date range if from/to provided
  interface ExpandedEvent {
    id: string
    calendar_id: string
    owner_user_id: string
    title: string
    description: string | null
    location: string | null
    start_at: string
    end_at: string
    event_timezone: string
    all_day: boolean
    rrule: string | null
    is_recurring: boolean
    recurrence_id: string | null
    is_cancelled: boolean
    calendars: Record<string, unknown>
  }

  const expandedEvents: ExpandedEvent[] = []

  for (const evt of events) {
    const e = evt as Record<string, unknown>
    if (!e.rrule && rangeStartIso && rangeEndIso) {
      expandedEvents.push({
        ...(e as unknown as ExpandedEvent),
        is_recurring: false,
        recurrence_id: null,
        is_cancelled: false
      })
    } else if (e.rrule && rangeStart && rangeEnd) {
      const duration = new Date(e.end_at as string).getTime() - new Date(e.start_at as string).getTime()

      const occurrences = expandRecurrence(
        e.start_at as string,
        e.rrule as string,
        rangeStart,
        rangeEnd
      )

      const eventExceptions = exceptions.filter(
        (ex: Record<string, unknown>) => ex.event_id === e.id
      )

      for (const occ of occurrences) {
        const recurrenceId = occ.toISOString()
        const exception = eventExceptions.find(
          (ex: Record<string, unknown>) => ex.recurrence_id === recurrenceId
        )

        const isCancelled = exception
          ? (exception.type as string) === 'cancelled'
          : false

        if (!isCancelled) {
          const occEnd = new Date(occ.getTime() + duration)
          expandedEvents.push({
            id: e.id as string,
            calendar_id: e.calendar_id as string,
            owner_user_id: e.owner_user_id as string,
            title: (exception && (exception.override_title as string | null))
              ? (exception.override_title as string)
              : (e.title as string),
            description: (exception && (exception.override_description as string | null))
              ? (exception.override_description as string)
              : (e.description as string | null),
            location: (exception && (exception.override_location as string | null))
              ? (exception.override_location as string)
              : (e.location as string | null),
            start_at: (exception && (exception.override_start_at as string | null))
              ? (exception.override_start_at as string)
              : occ.toISOString(),
            end_at: (exception && (exception.override_end_at as string | null))
              ? (exception.override_end_at as string)
              : occEnd.toISOString(),
            event_timezone: e.event_timezone as string,
            all_day: e.all_day as boolean,
            rrule: e.rrule as string,
            is_recurring: true,
            recurrence_id: recurrenceId,
            is_cancelled: false,
            calendars: e.calendars as Record<string, unknown>
          })
        }
      }
    } else {
      expandedEvents.push({
        ...(e as unknown as ExpandedEvent),
        is_recurring: Boolean(e.rrule),
        recurrence_id: null,
        is_cancelled: false
      })
    }
  }

  // Sort expanded events by start_at
  expandedEvents.sort((a, b) =>
    new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  )

  return {
    data: expandedEvents,
    total: count ?? 0,
    page,
    pageSize
  }
})
