<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'onboarding']
})

const app = useAppConfig()
const route = useRoute()
const { project } = useProject()

const conversationCode = ref(route.params.conversation_code)
const isNew = computed(() => conversationCode.value === '@new')

const { data, execute } = useApi<Conversation>(() => `/conversations/${conversationCode.value}`, {
  params: {
    project_code: project.value?.code
  },
  immediate: false
})

const { data: conversations, refresh: refreshConversations } = useApi<PaginatedList<Conversation>>(`/conversations`, {
  params: {
    project_code: project.value?.code
  }
})

if (!isNew.value) {
  await execute()
}

const items = computed(() => [
  { label: 'Conversations', icon: app.ui.icons.knowledge, to: '/conversations' },
  { label: data.value?.subject || 'New' }
])

async function handleNewConversation(code: string) {
  conversationCode.value = code
  route.params.conversation_code = code
  await execute()
  window.history.replaceState({}, '', `/conversations/${conversationCode.value}`)
}

async function handleChatComplete(_chat: Chat) {
  await execute()
}
</script>

<template>
  <UDashboardPanel id="conversation">
    <template #header>
      <UDashboardNavbar
        title="Conversations"
        :ui="{ right: 'gap-3' }"
      >
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <USlideover
            title="Conversation list"
            inset
            @update:open="isOpen => isOpen && refreshConversations()"
          >
            <UButton
              icon="i-lucide-history"
              size="md"
              variant="ghost"
              color="neutral"
              class="rounded-full"
            />
            <template #body>
              <UNavigationMenu
                :items="[
                  {
                    label: '새 대화',
                    icon: 'i-lucide-plus'
                  },
                  ...conversations.items?.map(conversation => ({
                    label: conversation.subject,
                    to: `/conversations/${conversation.code}`
                  }))
                ]"
                orientation="vertical"
              />
            </template>
          </USlideover>
        </template>
      </UDashboardNavbar>
      <UDashboardToolbar>
        <template #left>
          <UBreadcrumb :items="items" />
        </template>
      </UDashboardToolbar>
    </template>
    <template #body>
      <ChatContainer
        v-if="project"
        :project-code="project.code"
        :conversation-code="data?.code"
        @on-new-conversation="handleNewConversation"
        @on-chat-complete="handleChatComplete"
      />
    </template>
  </UDashboardPanel>
</template>

<style scoped>

</style>
