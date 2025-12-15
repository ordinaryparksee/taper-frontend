<script setup lang="tsx">
import { UButton } from '#components'

definePageMeta({
  middleware: ['auth', 'onboarding']
})

const { project } = useProject()
</script>

<template>
  <UDashboardPanel id="agents">
    <template #header>
      <UDashboardNavbar title="Agents" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            to="/agents/@new"
            icon="i-lucide-plus"
            size="md"
            class="rounded-full"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- AgentList 컴포넌트가 아직 생성되지 않았을 수 있으므로 주석 처리하거나 텍스트로 대체 -->
      <div v-if="project" class="p-4">
        Agent List will be here.
      </div>
    </template>
  </UDashboardPanel>
</template>

<style scoped>

</style>
