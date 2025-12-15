<script setup lang="tsx">
import type { FormSubmitEvent, SelectItem } from '@nuxt/ui'
import type { Project, Credential } from '#shared/types'
import * as z from 'zod'

definePageMeta({
  middleware: ['auth', 'onboarding']
})

const app = useAppConfig()
const { $api } = useNuxtApp()
const route = useRoute()
const toast = useToast()
const project = useState<Project>('project')
const isNew = computed(() => route.params.credential_code === '@new')

const { data, refresh, execute } = useApi<Credential>(`/credentials/${route.params.credential_code}`, {
  immediate: false,
  lazy: true
})

if (!isNew.value) {
  await execute()
}

const credentialSchema = z.object({
  name: z.string().min(2, 'Too short'),
  type: z.enum(['BASIC_AUTH', 'API_KEY', 'SSH', 'HTTP_HEADER'])
})
type CredentialSchema = z.output<typeof credentialSchema>

const form = ref<HTMLFormElement>()
const submitting = ref(false)

const credential = reactive<Partial<CredentialSchema>>({
  name: data.value?.name || '',
  type: data.value?.type || 'BASIC_AUTH'
})

// BASIC_AUTH
const basicAuthId = ref<string>(credential.type === 'BASIC_AUTH' ? (data.value?.data.username as string ?? '') : '')
const basicAuthPassword = ref<string>(credential.type === 'BASIC_AUTH' ? (data.value?.data.password as string ?? '') : '')

// API Key
const apiKey = ref<string>(credential.type === 'API_KEY' ? (data.value?.data.token as string ?? '') : '')

// SSH
const sshUsername = ref<string>(credential.type === 'SSH' ? (data.value?.data.username as string ?? '') : '')
const sshPassword = ref<string>(credential.type === 'SSH' ? (data.value?.data.password as string ?? '') : '')
const sshPrivateKey = ref<string>(credential.type === 'SSH' ? (data.value?.data.private_key as string ?? '') : '')

// HTTP Header
const httpHeader = ref<string>(credential.type === 'HTTP_HEADER' ? JSON.stringify(data.value?.data) : '{}')

const credentialData = computed(() => {
  if (credential.type === 'BASIC_AUTH') {
    return {
      username: basicAuthId.value,
      password: basicAuthPassword.value
    }
  } else if (credential.type === 'API_KEY') {
    return {
      type: 'Bearer',
      token: apiKey.value
    }
  } else if (credential.type === 'SSH') {
    return {
      username: sshUsername.value,
      password: sshPassword.value,
      private_key: sshPrivateKey.value
    }
  } else {
    try {
      return JSON.parse(httpHeader.value)
    } catch {
      return {}
    }
  }
})

async function submit() {
  form.value?.submit()
}

async function onSubmit(event: FormSubmitEvent<CredentialSchema>) {
  try {
    submitting.value = true
    const body = {
      name: event.data.name,
      type: event.data.type,
      data: credentialData.value
    }
    await $api<Credential>(data.value ? `/credentials/${data.value.code}` : '/credentials', {
      method: data.value ? 'PUT' : 'POST',
      params: { project_code: project.value?.code },
      body
    })
    toast.add({
      title: 'Success',
      description: 'Credential saved successfully.',
      icon: 'i-lucide-check',
      color: 'success'
    })
    if (isNew.value) {
      await navigateTo('/credentials')
    } else {
      await refresh()
    }
  } finally {
    submitting.value = false
  }
}

const typeItems = ref([
  { label: 'Basic Auth', value: 'BASIC_AUTH', icon: 'i-lucide-user' },
  { label: 'API Key', value: 'API_KEY', icon: 'i-lucide-key-round' },
  { label: 'SSH', value: 'SSH', icon: 'i-lucide-terminal' },
  { label: 'HTTP Header', value: 'HTTP_HEADER', icon: 'i-lucide-braces' }
] satisfies SelectItem[])
const typeIcon = computed(() => typeItems.value.find(item => item.value === credential.type)?.icon)

const items = computed(() => [
  { label: 'Credentials', icon: app.ui.icons.credential, to: '/credentials' },
  { label: data.value?.name || 'New' }
])
</script>

<template>
  <UDashboardPanel id="credentials">
    <template #header>
      <UDashboardNavbar title="Credentials" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            icon="i-lucide-check"
            size="md"
            class="rounded-full"
            :loading="submitting"
            :disabled="submitting"
            @click="submit"
          />
        </template>
      </UDashboardNavbar>
      <UDashboardToolbar>
        <template #left>
          <UBreadcrumb :items="items" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UForm
        id="credential"
        ref="form"
        class="space-y-6 max-w-3xl"
        :schema="credentialSchema"
        :state="credential"
        @submit="onSubmit"
      >
        <UPageCard
          title="Settings"
          description="Store secrets securely to access external services."
          variant="naked"
          orientation="horizontal"
        >
          <UButton
            form="credential"
            :label="submitting ? 'Saving…' : 'Save changes'"
            color="neutral"
            type="submit"
            class="w-fit lg:ms-auto"
            :loading="submitting"
            :disabled="submitting"
          />
        </UPageCard>

        <UPageCard variant="naked">
          <UFormField
            name="name"
            label="Name"
            description="Friendly label for this credential."
            required
            class="space-y-2"
          >
            <UInput
              v-model="credential.name"
              icon="i-lucide-type"
              size="lg"
              placeholder="e.g., OpenAI API Key"
              autocomplete="off"
              class="w-full"
              :disabled="submitting"
              :autofocus="isNew"
            />
          </UFormField>

          <UFormField
            name="type"
            label="Type"
            description="Select the credential type."
            required
            class="space-y-2 mt-4"
          >
            <USelect
              v-model="credential.type"
              :items="typeItems"
              :icon="typeIcon"
              option-attribute="label"
              value-attribute="value"
              size="lg"
              :disabled="submitting"
              class="w-full"
            />
          </UFormField>

          <UFormField
            v-if="credential.type === 'API_KEY'"
            name="data"
            label="API Key"
            description="Enter your API key."
            required
            class="space-y-2 mt-4"
          >
            <UInput
              v-model="apiKey"
              type="password"
              placeholder="e.g., sk-..."
              class="w-full"
            />
          </UFormField>

          <template v-else-if="credential.type === 'SSH'">
            <UFormField
              name="username"
              label="Username"
              required
              class="space-y-2 mt-4"
            >
              <UInput v-model="sshUsername" placeholder="e.g., ubuntu" class="w-full" />
            </UFormField>
            <UFormField
              name="password"
              label="Password"
              description="Leave empty if using a private key."
              class="space-y-2 mt-4"
            >
              <UInput v-model="sshPassword" type="password" class="w-full" />
            </UFormField>
            <UFormField
              name="private_key"
              label="Private Key"
              description="Paste your private key (OpenSSH format)."
              class="space-y-2 mt-4"
            >
              <UTextarea
                v-model="sshPrivateKey"
                :rows="5"
                placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                class="font-mono w-full"
              />
            </UFormField>
          </template>

          <template v-else-if="credential.type === 'BASIC_AUTH'">
            <UFormField
              name="id"
              label="ID"
              required
              class="space-y-2 mt-4"
            >
              <UInput v-model="basicAuthId" placeholder="e.g., dbadmin, myemail@domain.com" class="w-full" />
            </UFormField>
            <UFormField
              name="password"
              label="Password"
              required
              class="space-y-2 mt-4"
            >
              <UInput v-model="basicAuthPassword" type="password" class="w-full" />
            </UFormField>
          </template>

          <UFormField
            v-else
            name="data"
            label="Data"
            description="Provide a JSON object with the required fields (e.g., {'x-api-key': '...'})."
            required
            class="space-y-2 mt-4"
          >
            <UTextarea
              v-model="httpHeader"
              :rows="10"
              :disabled="submitting"
              class="font-mono w-full"
            />
          </UFormField>
        </UPageCard>
      </UForm>
    </template>
  </UDashboardPanel>
</template>

<style scoped>

</style>
