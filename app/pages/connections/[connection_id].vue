<script setup lang="tsx">
import type { FormSubmitEvent, SelectItem } from '@nuxt/ui'
import * as z from 'zod'

definePageMeta({
  middleware: ['auth', 'onboarding']
})

const app = useAppConfig()
const { $api } = useNuxtApp()
const route = useRoute()
const toast = useToast()
const { project } = useProject()
const isNew = computed(() => route.params.connection_id === '@new')

const { data, refresh, execute } = useApi<BaseResponse<ConnectionSchema>>(`/connections/${route.params.connection_id}`, {
  immediate: false,
  lazy: true
})

if (!isNew.value) {
  await execute()
}
const connectionSchema = z.object({
  credential_id: z.string().nullable(),
  ssh_tunnel_connection_id: z.string().nullable(),
  proxy_connection_id: z.string().nullable(),
  name: z.string().min(2, 'Too short'),
  driver: z.enum(['OPENSEARCH', 'PGVECTOR', 'POSTGRESQL', 'SSH', 'MYSQL', 'PROXY']),
  uri: z.string()
})
type ConnectionFormSchema = z.output<typeof connectionSchema>

const form = ref<HTMLFormElement>()
const submitting = ref(false)
const testing = ref(false)

const connection = reactive<Partial<ConnectionFormSchema>>({
  credential_id: data.value?.data.credential_id ?? null,
  ssh_tunnel_connection_id: data.value?.data.ssh_tunnel_connection_id ?? null,
  proxy_connection_id: data.value?.data.proxy_connection_id ?? null,
  name: data.value?.data.name ?? '',
  driver: data.value?.data.driver ?? 'OPENSEARCH',
  uri: data.value?.data.uri ?? ''
})

async function submit() {
  form.value?.submit()
}

async function onTest() {
  if (isNew.value) {
    toast.add({
      title: 'Warning',
      description: 'Please save the connection before testing.',
      icon: 'i-lucide-alert-triangle',
      color: 'warning'
    })
    return
  }

  try {
    testing.value = true
    await $api(`/connections/${data.value?.data.id}/test`, {
      method: 'POST'
    })

    toast.add({
      title: 'Success',
      description: 'Connection test passed.',
      icon: 'i-lucide-check',
      color: 'success'
    })
  } catch (error) {
    const fetchError = error as { data?: { detail?: string } }
    toast.add({
      title: 'Failed',
      description: fetchError.data?.detail || 'Connection test failed.',
      icon: 'i-lucide-x',
      color: 'error'
    })
  } finally {
    testing.value = false
  }
}

async function onSubmit(event: FormSubmitEvent<ConnectionFormSchema>) {
  try {
    submitting.value = true
    await $api<BaseResponse<ConnectionSchema>>(data.value ? `/connections/${data.value.data.id}` : '/connections', {
      method: data.value ? 'PUT' : 'POST',
      params: {
        project_id: project.value?.id
      },
      body: {
        ...event.data
      }
    })
    toast.add({
      title: 'Success',
      description: 'Connection saved successfully.',
      icon: 'i-lucide-check',
      color: 'success'
    })
    if (isNew.value) {
      await navigateTo('/connections')
    } else {
      await refresh()
    }
  } finally {
    submitting.value = false
  }
}

const driverItems = ref([
  {
    label: 'OpenSearch',
    value: 'OPENSEARCH',
    avatar: {
      src: '/icon/opensearch_mark_default.svg',
      alt: 'OpenSearch logo'
    }
  },
  {
    label: 'PGVector',
    value: 'PGVECTOR',
    avatar: {
      src: '/icon/postgres_mark_default.png',
      alt: 'PGVector logo'
    }
  },
  {
    label: 'PostgreSQL',
    value: 'POSTGRESQL',
    avatar: {
      src: '/icon/postgres_mark_default.png',
      alt: 'PostgreSQL logo'
    }
  },
  {
    label: 'MySQL',
    value: 'MYSQL',
    icon: 'i-lucide-database'
  },
  {
    label: 'SSH',
    value: 'SSH',
    icon: 'i-lucide-terminal'
  },
  {
    label: 'Proxy',
    value: 'PROXY',
    icon: 'i-lucide-shield'
  }
] satisfies SelectItem[])
const driverAvatar = computed(() => driverItems.value.find(item => item.value === connection.driver)?.avatar)
const driverIcon = computed(() => driverItems.value.find(item => item.value === connection.driver)?.icon)

const items = computed(() => [
  { label: 'Connections', icon: app.ui.icons.connection, to: '/connections' },
  { label: data.value?.data.name || 'New' }
])
</script>

<template>
  <UDashboardPanel id="connections">
    <template #header>
      <UDashboardNavbar title="Connections" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            v-if="!isNew"
            label="Test"
            icon="i-lucide-zap"
            color="neutral"
            variant="ghost"
            :loading="testing"
            :disabled="submitting || testing"
            @click="onTest"
          />
          <UButton
            icon="i-lucide-check"
            size="md"
            class="rounded-full"
            :loading="submitting"
            :disabled="submitting || testing"
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
        id="connection"
        ref="form"
        class="space-y-6 max-w-3xl"
        :schema="connectionSchema"
        :state="connection"
        @submit="onSubmit"
      >
        <UPageCard
          title="Settings"
          description="Configure how Taper connects to your search backend."
          variant="naked"
          orientation="horizontal"
        >
          <UButton
            form="connection"
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
            description="Friendly label for this connection (e.g., Production Search)."
            required
            class="space-y-2"
          >
            <UInput
              v-model="connection.name"
              icon="i-lucide-type"
              size="lg"
              placeholder="e.g., Production Search"
              autocomplete="off"
              class="w-full"
              :disabled="submitting"
              :autofocus="isNew"
            />
          </UFormField>

          <UFormField
            name="driver"
            label="Driver"
            description="Select the connection driver."
            required
            class="space-y-2 mt-4"
          >
            <USelect
              v-model="connection.driver"
              :items="driverItems"
              option-attribute="label"
              value-attribute="value"
              size="lg"
              :avatar="driverAvatar"
              :icon="driverIcon"
              :disabled="submitting"
              class="w-full"
            />
          </UFormField>

          <UFormField
            name="uri"
            label="URI"
            description="Connection endpoint. Use a full URL including protocol (e.g., https://opensearch.example.com)."
            required
            class="space-y-2 mt-4"
          >
            <UInput
              v-model="connection.uri"
              icon="i-lucide-link"
              size="lg"
              autocomplete="off"
              placeholder="https://opensearch.example.com"
              class="font-mono w-full"
              :disabled="submitting"
            />
          </UFormField>

          <UFormField
            name="credential_id"
            label="Credential"
            description="Select the credential to use for this connection (optional)."
            class="space-y-2 mt-4"
          >
            <CredentialSelector
              v-model="connection.credential_id"
              :multiple="false"
              :project-id="project?.id || null"
              :disabled="submitting"
              button-label="Select credential"
            />
          </UFormField>

          <UFormField
            name="ssh_tunnel_connection_id"
            label="SSH Tunnel Connection"
            description="Select the connection to use for SSH tunneling (optional)."
            class="space-y-2 mt-4"
          >
            <ConnectionSelector
              v-if="project?.id"
              v-model="connection.ssh_tunnel_connection_id"
              :multiple="false"
              :project-id="project.id"
              :drivers="['SSH']"
              :disabled="submitting"
              button-label="Select SSH connection"
            />
          </UFormField>

          <UFormField
            name="proxy_connection_id"
            label="Proxy Connection"
            description="Select the connection to use as a proxy (optional)."
            class="space-y-2 mt-4"
          >
            <ConnectionSelector
              v-if="project?.id"
              v-model="connection.proxy_connection_id"
              :multiple="false"
              :project-id="project.id"
              :drivers="['PROXY']"
              :disabled="submitting"
              button-label="Select proxy connection"
            />
          </UFormField>

          <div class="mt-6 text-sm text-gray-500 dark:text-gray-400">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-info" class="text-primary" />
              <span>Tip: Ensure the endpoint is reachable from your deployment environment. Credentials and advanced settings will be added in a later step.</span>
            </div>
          </div>
        </UPageCard>
      </UForm>
    </template>
  </UDashboardPanel>
</template>

<style scoped>

</style>
