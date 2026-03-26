import { z } from 'zod'
import { getSupabaseAdminClient } from '../../utils/supabase'
import { requireAuthUser } from '../../utils/require-auth'

type HabitTreeNodeInput = {
  habitId: string
  children: HabitTreeNodeInput[]
}

const habitTreeNodeSchema: z.ZodType<HabitTreeNodeInput> = z.lazy(() => z.object({
  habitId: z.string().uuid('ID do hábito inválido'),
  children: z.array(habitTreeNodeSchema).default([])
}))

const bodySchema = z.object({
  nodes: z.array(habitTreeNodeSchema)
})

export default eventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const body = await readBody(event)
  const parsedBody = bodySchema.safeParse(body)

  if (!parsedBody.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Árvore de hábitos inválida',
      data: parsedBody.error.flatten()
    })
  }

  const supabase = getSupabaseAdminClient()
  const visibleHabitIds = new Set<string>()
  const stackPairs: Array<{ triggerHabitId: string, newHabitId: string }> = []
  const sortOrders = new Map<string, number>()
  const childParents = new Map<string, string>()

  function visit(nodes: HabitTreeNodeInput[], parentHabitId: string | null = null) {
    nodes.forEach((node, index) => {
      if (visibleHabitIds.has(node.habitId)) {
        throw createError({ statusCode: 400, statusMessage: 'A árvore contém hábitos duplicados' })
      }

      visibleHabitIds.add(node.habitId)
      sortOrders.set(node.habitId, index)

      if (parentHabitId) {
        if (childParents.has(node.habitId)) {
          throw createError({ statusCode: 400, statusMessage: 'Um hábito não pode ter mais de um pai na árvore' })
        }

        childParents.set(node.habitId, parentHabitId)
        stackPairs.push({ triggerHabitId: parentHabitId, newHabitId: node.habitId })
      }

      visit(node.children, node.habitId)
    })
  }

  visit(parsedBody.data.nodes)

  const habitIds = Array.from(visibleHabitIds)

  if (habitIds.length === 0) {
    return { success: true, updatedHabits: 0, createdStacks: 0, archivedStacks: 0 }
  }

  const { data: habits, error: habitsError } = await supabase
    .from('habits')
    .select('id')
    .eq('user_id', user.id)
    .in('id', habitIds)
    .is('archived_at', null)

  if (habitsError) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao validar hábitos', data: habitsError.message })
  }

  if ((habits?.length ?? 0) !== habitIds.length) {
    throw createError({ statusCode: 400, statusMessage: 'Um ou mais hábitos não pertencem ao usuário ou estão arquivados' })
  }

  const now = new Date().toISOString()

  const habitUpdateResults = await Promise.all(
    habitIds.map(habitId => supabase
      .from('habits')
      .update({
        sort_order: sortOrders.get(habitId) ?? 0,
        updated_at: now
      })
      .eq('id', habitId)
      .eq('user_id', user.id))
  )

  const habitUpdateError = habitUpdateResults.find(result => result.error)
  if (habitUpdateError?.error) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao atualizar a ordem dos hábitos', data: habitUpdateError.error.message })
  }

  const { data: existingStacks, error: stacksError } = await supabase
    .from('habit_stacks')
    .select('id, trigger_habit_id, new_habit_id, archived_at')
    .eq('user_id', user.id)
    .in('trigger_habit_id', habitIds)
    .in('new_habit_id', habitIds)

  if (stacksError) {
    throw createError({ statusCode: 500, statusMessage: 'Falha ao sincronizar empilhamentos', data: stacksError.message })
  }

  const expectedPairs = new Set(stackPairs.map(pair => `${pair.triggerHabitId}:${pair.newHabitId}`))
  const activeStacks = (existingStacks ?? []).filter(stack => stack.archived_at === null)

  const stacksToArchive = activeStacks.filter((stack) => {
    const key = `${String(stack.trigger_habit_id)}:${String(stack.new_habit_id)}`
    return !expectedPairs.has(key)
  })

  const stacksToCreate = stackPairs.filter((pair) => {
    const key = `${pair.triggerHabitId}:${pair.newHabitId}`
    return !activeStacks.some(stack => `${String(stack.trigger_habit_id)}:${String(stack.new_habit_id)}` === key)
  })

  if (stacksToArchive.length > 0) {
    const { error: archiveError } = await supabase
      .from('habit_stacks')
      .update({ archived_at: now })
      .in('id', stacksToArchive.map(stack => String(stack.id)))
      .eq('user_id', user.id)

    if (archiveError) {
      throw createError({ statusCode: 500, statusMessage: 'Falha ao arquivar empilhamentos antigos', data: archiveError.message })
    }
  }

  let createdStacks = 0

  for (const pair of stacksToCreate) {
    const { error: createStackError } = await supabase
      .from('habit_stacks')
      .insert({
        user_id: user.id,
        trigger_habit_id: pair.triggerHabitId,
        new_habit_id: pair.newHabitId
      })

    if (createStackError) {
      throw createError({ statusCode: 500, statusMessage: 'Falha ao criar empilhamento', data: createStackError.message })
    }

    createdStacks++
  }

  return {
    success: true,
    updatedHabits: habitIds.length,
    createdStacks,
    archivedStacks: stacksToArchive.length
  }
})
