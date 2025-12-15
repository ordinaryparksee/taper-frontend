<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Project } from '#shared/types'
import * as z from 'zod'

definePageMeta({
  middleware: ['auth']
})

const app = useAppConfig()
const { $api } = useNuxtApp()
const route = useRoute()
const toast = useToast()
const { refresh: refreshProject } = useProject()
const isNew = computed(() => route.params.project_code === '@new')

const { data, refresh, execute } = useApi<Project>(`/projects/${route.params.project_code}`, {
  immediate: false,
  lazy: true
})

if (!isNew.value) {
  await execute()
}

const projectSchema = z.object({
  name: z.string().min(2, 'Too short')
})
type ProjectSchema = z.output<typeof projectSchema>

const form = ref<HTMLFormElement>()

const project = reactive<Partial<ProjectSchema>>({
  name: data.value?.name || ''
})

async function submit() {
  form.value?.submit()
}

async function onSubmit(event: FormSubmitEvent<ProjectSchema>) {
  await $api<Project>(data.value ? `/projects/${data.value.code}` : '/projects', {
    method: data.value ? 'PUT' : 'POST',
    body: event.data
  })
  await refreshProject()

  toast.add({
    title: 'Success',
    description: 'Project saved successfully.',
    icon: 'i-lucide-check',
    color: 'success'
  })

  if (isNew.value) {
    await navigateTo('/projects')
  } else {
    await refresh()
  }
}

const items = computed(() => [
  {
    label: 'Projects',
    icon: app.ui.icons.project,
    to: '/projects'
  },
  {
    label: data.value?.name || 'New'
  }
])
</script>

<template>
  <UDashboardPanel id="projects">
    <template #header>
      <UDashboardNavbar title="Projects" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            icon="i-lucide-check"
            size="md"
            class="rounded-full"
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
        id="project"
        ref="form"
        :schema="projectSchema"
        :state="project"
        @submit="onSubmit"
      >
        <UPageCard
          title="Projects"
          description="These informations will be displayed publicly."
          variant="naked"
          orientation="horizontal"
          class="mb-4"
        >
          <UButton
            form="project"
            label="Save changes"
            color="neutral"
            type="submit"
            class="w-fit lg:ms-auto"
          />
        </UPageCard>

        <UPageCard variant="naked">
          <UFormField
            name="name"
            label="Name"
            description="Will appear on receipts, invoices, and other communication."
            required
            class="space-y-2"
          >
            <UInput
              v-model="project.name"
              autocomplete="off"
              class="w-full"
            />
          </UFormField>
        </UPageCard>
      </UForm>
    </template>
  </UDashboardPanel>
</template>

<style scoped>

</style>
