<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'auth'
})

useSeoMeta({
  title: 'Entrar',
  description: 'Acesse sua conta para continuar'
})

const toast = useToast()

const fields = [{
  name: 'email',
  type: 'text' as const,
  label: 'Email',
  placeholder: 'Digite seu email',
  required: true
}, {
  name: 'password',
  label: 'Senha',
  type: 'password' as const,
  placeholder: 'Digite sua senha'
}, {
  name: 'remember',
  label: 'Lembrar de mim',
  type: 'checkbox' as const
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
    title="Bem-vindo de volta"
    icon="i-lucide-lock"
    @submit="onSubmit"
  >
    <template #description>
      Não tem uma conta? <ULink
        to="/signup"
        class="text-primary font-medium"
      >Crie sua conta</ULink>.
    </template>

    <template #password-hint>
      <ULink
        to="/"
        class="text-primary font-medium"
        tabindex="-1"
      >Esqueceu a senha?</ULink>
    </template>

    <template #footer>
      Ao entrar, você concorda com nossos <ULink
        to="/"
        class="text-primary font-medium"
      >Termos de Serviço</ULink>.
    </template>
  </UAuthForm>
</template>
