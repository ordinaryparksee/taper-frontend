<script setup lang="tsx">
import { UButton } from '#components'

definePageMeta({
  middleware: ['auth', 'onboarding']
})

const { project } = useProject()
</script>

<template>
  <UDashboardPanel id="flows">
    <template #header>
      <UDashboardNavbar title="Flows" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            to="/flows/@new"
            icon="i-lucide-plus"
            size="md"
            class="rounded-full"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="project" class="p-4">
        Flow list will be here.
      </div>
    </template>
  </UDashboardPanel>
</template>

<style scoped>

</style>
