<script setup lang="ts">
const columns = [{
  label: 'Recursos',
  children: [{
    label: 'Ajuda'
  }, {
    label: 'Documentação'
  }, {
    label: 'Roadmap'
  }, {
    label: 'Novidades'
  }]
}, {
  label: 'Produto',
  children: [{
    label: 'Hábitos'
  }, {
    label: 'Notas'
  }, {
    label: 'Coleções'
  }, {
    label: 'Tags'
  }]
}, {
  label: 'Empresa',
  children: [{
    label: 'Sobre'
  }, {
    label: 'Planos'
  }, {
    label: 'Carreiras'
  }, {
    label: 'Blog'
  }]
}]

const toast = useToast()

const email = ref('')
const loading = ref(false)

function onSubmit() {
  loading.value = true

  toast.add({
    title: 'Inscrição confirmada!',
    description: 'Você vai receber novidades do Second Brain por email.'
  })
}
</script>

<template>
  <USeparator
    icon="i-simple-icons-nuxtdotjs"
    class="h-px"
  />

  <UFooter :ui="{ top: 'border-b border-default' }">
    <template #top>
      <UContainer>
        <UFooterColumns :columns="columns">
          <template #right>
            <form @submit.prevent="onSubmit">
              <UFormField
                name="email"
                label="Receba novidades do Second Brain"
                size="lg"
              >
                <UInput
                  v-model="email"
                  type="email"
                  class="w-full"
                  placeholder="Digite seu email"
                >
                  <template #trailing>
                    <UButton
                      type="submit"
                      size="xs"
                      color="neutral"
                      label="Inscrever"
                    />
                  </template>
                </UInput>
              </UFormField>
            </form>
          </template>
        </UFooterColumns>
      </UContainer>
    </template>

    <template #left>
      <p class="text-muted text-sm">
        Second Brain • © {{ new Date().getFullYear() }}
      </p>
    </template>

    <template #right>
      <UButton
        to="/docs/getting-started"
        icon="i-lucide-book-open"
        aria-label="Abrir documentação"
        color="neutral"
        variant="ghost"
      />
      <UButton
        to="/changelog"
        icon="i-lucide-history"
        aria-label="Ver novidades"
        color="neutral"
        variant="ghost"
      />
      <UButton
        to="/blog"
        icon="i-lucide-pencil"
        aria-label="Abrir blog"
        color="neutral"
        variant="ghost"
      />
    </template>
  </UFooter>
</template>
