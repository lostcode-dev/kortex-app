<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Habit } from '~/types/habits'

const props = defineProps<{
  open: boolean
  habits: Habit[]
  initialTriggerHabitId?: string
  initialTriggerHabitName?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  created: []
}>()

const { createStack } = useHabits()

const schema = z
  .object({
    triggerHabitId: z.string().uuid('Selecione o hábito gatilho'),
    newHabitId: z.string().uuid('Selecione o hábito seguinte')
  })
  .refine((data) => data.triggerHabitId !== data.newHabitId, {
    message: 'O hábito gatilho e o seguinte devem ser diferentes',
    path: ['newHabitId']
  })

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  triggerHabitId: undefined,
  newHabitId: undefined
})

const loading = ref(false)

watch(
  () => [props.open, props.initialTriggerHabitId] as const,
  ([open, initialTriggerHabitId]) => {
    if (!open) return
    state.triggerHabitId = initialTriggerHabitId
    state.newHabitId = undefined
  },
  { immediate: true }
)

const habitItems = computed(() =>
  props.habits
    .filter((h) => h.id !== props.initialTriggerHabitId)
    .map((h) => ({ label: h.name, value: h.id }))
)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (loading.value) return
  loading.value = true
  try {
    const result = await createStack(event.data)
    if (result) {
      state.triggerHabitId = undefined
      state.newHabitId = undefined
      emit('created')
      emit('update:open', false)
    }
  } finally {
    loading.value = false
  }
}

function onClose() {
  emit('update:open', false)
}
</script>

<template>
  <UModal
    :open="props.open"
    title="Empilhar hábitos"
    description="Depois de X, eu farei Y."
    :ui="{
      overlay: 'z-[200] bg-elevated/75',
      content: 'z-[210]'
    }"
    @update:open="onClose"
  >
    <template #body>
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField v-if="!props.initialTriggerHabitId" label="Depois de..." name="triggerHabitId">
          <USelect
            v-model="(state.triggerHabitId as string)"
            :items="habitItems"
            value-key="value"
            placeholder="Selecione o hábito gatilho"
            icon="i-lucide-zap"
            class="w-full"
          />
        </UFormField>

        <UFormField v-else label="Depois de...">
          <UInput :model-value="props.initialTriggerHabitName ?? ''" icon="i-lucide-zap" disabled class="w-full" />
        </UFormField>

        <div class="flex items-center gap-2 text-muted">
          <UIcon name="i-lucide-arrow-down" class="size-5" />
          <span class="text-sm font-medium">Eu farei...</span>
        </div>

        <UFormField label="Hábito seguinte" name="newHabitId">
          <USelect
            v-model="(state.newHabitId as string)"
            :items="habitItems"
            value-key="value"
            placeholder="Selecione o hábito seguinte"
            icon="i-lucide-target"
            class="w-full"
          />
        </UFormField>

        <div class="flex justify-end gap-2 pt-2">
          <UButton
            icon="i-lucide-x"
            label="Cancelar"
            type="button"
            color="neutral"
            variant="subtle"
            @click="onClose"
          />
          <UButton
            icon="i-lucide-link"
            label="Empilhar"
            type="submit"
            :loading="loading"
            :disabled="loading"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
