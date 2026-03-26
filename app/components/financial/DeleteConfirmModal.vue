<script setup lang="ts">
defineProps<{
  open: boolean
  title: string
  description: string
  itemName: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'confirmed': []
}>()

const deleting = ref(false)

async function onConfirm(): Promise<void> {
  deleting.value = true
  try {
    emit('confirmed')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <UModal :open="open" @update:open="emit('update:open', $event)">
    <template #header>
      <h3 class="text-lg font-semibold">
        {{ title }}
      </h3>
    </template>

    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-muted">
          {{ description }}
        </p>
        <p class="text-sm font-medium">
          "{{ itemName }}"
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          icon="i-lucide-x"
          label="Cancelar"
          color="neutral"
          variant="subtle"
          @click="emit('update:open', false)"
        />
        <UButton
          icon="i-lucide-trash-2"
          label="Excluir"
          color="error"
          :loading="deleting"
          @click="onConfirm"
        />
      </div>
    </template>
  </UModal>
</template>
