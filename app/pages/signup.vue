<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'auth'
})

useSeoMeta({
  title: 'Criar conta',
  description: 'Crie sua conta para começar'
})

const toast = useToast()

const fields = [{
  name: 'name',
  type: 'text' as const,
  label: 'Nome',
  placeholder: 'Digite seu nome'
}, {
  name: 'email',
  type: 'text' as const,
  label: 'Email',
  placeholder: 'Digite seu email'
}, {
  name: 'password',
  label: 'Senha',
  type: 'password' as const,
  placeholder: 'Crie uma senha'
}]

const providers = [{
  label: 'Google',
  icon: 'i-simple-icons-google',
  onClick: () => {
    toast.add({ title: 'Google', description: 'Entrar com Google' })
  }
}, {
  label: 'GitHub',
  icon: 'i-simple-icons-github',
  onClick: () => {
    toast.add({ title: 'GitHub', description: 'Entrar com GitHub' })
  }
}]

const schema = z.object({
  name: z.string().min(1, 'O nome é obrigatório'),
  email: z.email('Email inválido'),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres')
})

type Schema = z.output<typeof schema>

function onSubmit(payload: FormSubmitEvent<Schema>) {
  console.log('Submitted', payload)
}
</script>

<template>
  <UAuthForm
    :fields="fields"
    :schema="schema"
    :providers="providers"
    title="Crie sua conta"
    :submit="{ label: 'Criar conta' }"
    @submit="onSubmit"
  >
    <template #description>
      Já tem uma conta? <ULink
        to="/login"
        class="text-primary font-medium"
      >Entrar</ULink>.
    </template>

    <template #footer>
      Ao criar a conta, você concorda com nossos <ULink
        to="/"
        class="text-primary font-medium"
      >Termos de Serviço</ULink>.
    </template>
  </UAuthForm>
</template>
