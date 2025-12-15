<script setup lang="ts">
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'
import * as z from 'zod'

definePageMeta({
  layout: 'plain'
})

const { fetch: refreshSession } = useUserSession()
const toast = useToast()

const loading = ref(false)

const schema = z.object({
  email: z.email('Invalid email'),
  password: z.string('Password is required').min(4, 'Must be at least 4 characters')
})
type Schema = z.output<typeof schema>

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload.data)
    })

    if (response.ok) {
      await refreshSession()
      await navigateTo('/')
    } else {
      throw createError({
        statusCode: 401,
        message: 'Bad credentials'
      })
    }
  } catch (error) {
    console.error('Login failed:', error)
    // 여기에 로그인 실패 시 사용자에게 보여줄 에러 메시지 처리를 추가할 수 있습니다.
    // 예를 들어, UToast 등을 사용할 수 있습니다.
  } finally {
    loading.value = false
  }
}

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
    name: 'remember',
    label: 'Remember me',
    type: 'checkbox'
  }
]

const providers = [
  {
    label: 'Google',
    icon: 'i-simple-icons-google',
    onClick: () => {
      toast.add({ title: 'Google', description: 'Login with Google' })
    }
  },
  {
    label: 'GitHub',
    icon: 'i-simple-icons-github',
    onClick: () => {
      toast.add({ title: 'GitHub', description: 'Login with GitHub' })
    }
  }
]
</script>

<template>
  <div class="flex items-center justify-center w-full h-full bg-gray-50 dark:bg-gray-900">
    <UPageCard>
      <UAuthForm
        title="Login"
        description="Enter your credentials to access your account."
        icon="i-lucide-user"
        :schema="schema"
        :fields="fields"
        :providers="providers"
        :loading="loading"
        :disabled="loading"
        @submit="onSubmit"
      >
        <template #footer>
          <div class="text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              You don't have an account?
              <UButton to="/auth/join" variant="link" :padded="false">
                Join now
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
