<script setup lang="ts">
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.bubble.css'

const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
}>(), {
  modelValue: '',
  placeholder: 'Escreva aqui...'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const toolbar = [
  [{ header: [2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['blockquote', 'link'],
  ['clean']
]

function normalizeRichTextValue(value: string | null | undefined): string {
  const normalized = (value ?? '').trim()

  if (!normalized || normalized === '<p><br></p>' || normalized === '<div><br></div>') {
    return ''
  }

  return normalized
}

const content = computed<string>({
  get: () => props.modelValue ?? '',
  set: (value) => {
    emit('update:modelValue', normalizeRichTextValue(value))
  }
})
</script>

<template>
  <ClientOnly>
    <div class="rich-text-shell rounded-lg border border-default bg-default">
      <QuillEditor
        v-model:content="content"
        content-type="html"
        theme="bubble"
        :toolbar="toolbar"
        :placeholder="placeholder"
        class="rich-text-editor"
      />
    </div>

    <template #fallback>
      <div class="rounded-lg border border-default bg-default p-4">
        <USkeleton class="h-32 w-full" />
      </div>
    </template>
  </ClientOnly>
</template>

<style scoped>
.rich-text-shell {
  position: relative;
}

.rich-text-shell :deep(.ql-bubble .ql-tooltip) {
  z-index: 100;
}

.rich-text-shell :deep(.ql-toolbar.ql-snow) {
  border: 0;
  border-bottom: 1px solid var(--ui-border);
  background: color-mix(in srgb, var(--ui-bg-muted) 72%, transparent);
}

.rich-text-shell :deep(.ql-container.ql-snow) {
  border: 0;
  font-family: inherit;
}

.rich-text-shell :deep(.ql-editor) {
  min-height: 9rem;
  color: var(--ui-text-highlighted);
  font-size: 0.9375rem;
  line-height: 1.6;
}

.rich-text-shell :deep(.ql-editor.ql-blank::before) {
  color: var(--ui-text-dimmed);
  font-style: normal;
}

.rich-text-shell :deep(.ql-stroke) {
  stroke: var(--ui-text-muted);
}

.rich-text-shell :deep(.ql-fill) {
  fill: var(--ui-text-muted);
}

.rich-text-shell :deep(.ql-picker) {
  color: var(--ui-text-muted);
}
</style>