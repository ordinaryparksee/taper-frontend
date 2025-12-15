<script setup lang="tsx">
import { UButton } from '#components'

definePageMeta({
  middleware: ['auth', 'onboarding']
})

const { project } = useProject()
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
            to="/connections/@new"
            icon="i-lucide-plus"
            size="md"
            class="rounded-full"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <ConnectionList v-if="project" :project-code="project.code" control />
    </template>
  </UDashboardPanel>
</template>

<style scoped>

</style>
