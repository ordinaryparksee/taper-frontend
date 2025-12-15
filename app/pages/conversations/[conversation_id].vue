<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'onboarding']
})

const app = useAppConfig()
const route = useRoute()
const { project } = useProject()

const conversationId = ref(route.params.conversation_id)
const isNew = computed(() => conversationId.value === '@new')

const { data, execute } = useApi<BaseResponse<ConversationSchema>>(() => `/conversations/${conversationId.value}`, {
  params: {
    project_id: project.value?.id
  },
  immediate: false
})

const { data: conversations, refresh: refreshConversations } = useApi<PaginatedList<ConversationSchema>>(`/conversations`, {
  params: {
    project_id: project.value?.id
  }
})

if (!isNew.value) {
  await execute()
}

const items = computed(() => [
  { label: 'Conversations', icon: app.ui.icons.knowledge, to: '/conversations' },
  { label: data.value?.data.subject || 'New' }
])

async function handleNewConversation(id: string) {
  conversationId.value = id
  route.params.conversation_id = id
  await execute()
  window.history.replaceState({}, '', `/conversations/${conversationId.value}`)
}

async function handleChatComplete(_chat: ChatSchema) {
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
                    to: `/conversations/${conversation.id}`
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
        :project-id="project.id"
        :conversation-id="data?.data.id"
        @on-new-conversation="handleNewConversation"
        @on-chat-complete="handleChatComplete"
      />
    </template>
  </UDashboardPanel>
</template>

<style scoped>

</style>
