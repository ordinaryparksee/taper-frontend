<script setup lang="tsx">
import { UButton } from '#components'

definePageMeta({
  middleware: ['auth', 'onboarding']
})
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
            to="/projects/@new"
            icon="i-lucide-plus"
            size="md"
            class="rounded-full"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <ProjectList control />
    </template>
  </UDashboardPanel>
</template>

<style scoped>

</style>
