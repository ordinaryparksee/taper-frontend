<script setup lang="ts">
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui'
import * as z from 'zod'

definePageMeta({
  layout: 'plain'
})

const loading = ref(false)

const schema = z.object({
  email: z.email('Invalid email'),
  password: z.string('Password is required').min(4, 'Must be at least 4 characters'),
  password_confirmation: z.string('Password confirmation is required').min(4, 'Must be at least 4 characters')
})
type Schema = z.output<typeof schema>

const fields: AuthFormField[] = [
  {
    name: 'email',
    type: 'email',
    label: 'Email',
    placeholder: 'Enter your email',
    required: true
  },
  {
    name: 'password',
    label: 'Password',
    type: 'password',
    placeholder: 'Enter your password',
    required: true
  },
  {
    name: 'password_confirmation',
    label: 'Password confirmation',
    type: 'password',
    placeholder: 'Enter your password again',
    required: true
  }
]

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    await fetch('/api/auth/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload.data)
    })
  } catch (error) {
    console.error('Login failed:', error)
    // 여기에 가입 실패 시 사용자에게 보여줄 에러 메시지 처리를 추가할 수 있습니다.
    // 예를 들어, UToast 등을 사용할 수 있습니다.
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex items-center justify-center w-full h-full bg-gray-50 dark:bg-gray-900">
    <UPageCard>
      <UAuthForm
        title="Join"
        description="Enter your credentials to create your account."
        icon="i-lucide-user"
        :schema="schema"
        :fields="fields"
        :loading="loading"
        :disabled="loading"
        @submit="onSubmit"
      >
        <template #footer>
          <div class="text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Already have an account?
              <UButton to="/auth/login" variant="link" :padded="false">
                Login
              </UButton>
            </p>
          </div>
        </template>
      </UAuthForm>
    </UPageCard>
  </div>
</template>

<style scoped>

</style>
