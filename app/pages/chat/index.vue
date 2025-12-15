<script setup lang="ts">
import type { ChatCompletionResponse, ChatMessage, ChatRole } from '~/types/chat'

const chatId = crypto.randomUUID()
const { model } = useModels()

const {
  dropzoneRef,
  isDragging,
  files,
  isUploading,
  uploadedFiles,
  addFiles,
  removeFile,
  clearFiles
} = useFileUploadWithStatus(chatId)

const messages = ref<{
  id: string
  role: ChatRole
  parts: { type: 'text', text: string }[]
}[]>([])

const prompt = ref('')
const loading = ref(false)

async function onSubmit() {
  if (!prompt.value.trim() || loading.value) return

  const userMessage = {
    id: crypto.randomUUID(),
    role: 'user' as const,
    parts: [
      {
        type: 'text' as const,
        text: prompt.value
      }
    ]
  }

  messages.value.push(userMessage)
  prompt.value = ''
  loading.value = true

  try {
    // 백엔드 API 형식에 맞게 메시지 변환
    const apiMessages: ChatMessage[] = messages.value.map(m => ({
      role: m.role,
      content: m.parts.map(p => p.text).join('\n')
    }))

    const response = await $fetch<ChatCompletionResponse>('/chat', {
      method: 'POST',
      body: {
        model: 'openrouter/x-ai/grok-4.1-fast',
        messages: apiMessages
      },
      baseURL: useRuntimeConfig().public.apiBase
    })

    const firstChoice = response.choices?.[0]
    if (firstChoice?.message) {
      const assistantMessage = firstChoice.message
      messages.value.push({
        id: response.id || crypto.randomUUID(),
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: assistantMessage.content || ''
          }
        ]
      })
    }
  } catch (error) {
    console.error('Failed to fetch chat completion:', error)
    // 에러 메시지 표시 (선택 사항)
    messages.value.push({
      id: crypto.randomUUID(),
      role: 'assistant',
      parts: [
        {
          type: 'text',
          text: '죄송합니다. 오류가 발생했습니다. 다시 시도해 주세요.'
        }
      ]
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex flex-col items-center justify-center h-screen w-full max-w-5xl mx-auto px-4 py-4">
    <UChatMessages
      v-if="messages.length > 0"
      :status="loading ? 'submitted' : 'ready'"
      :auto-scroll="{
        color: 'neutral',
        variant: 'outline'
      }"
      :messages="messages"
      :user="{
        variant: 'soft',
        avatar: {
          src: 'https://github.com/benjamincanac.png'
        }
      }"
      :assistant="{
        side: 'left',
        variant: 'soft',
        avatar: {
          icon: 'i-lucide-bot'
        },
        actions: [
          {
            label: 'Copy to clipboard',
            icon: 'i-lucide-copy'
          }
        ]
      }"
      class="flex-1 w-full"
    />

    <h1 v-else class="text-2xl font-bold mb-8">
      무엇을 도와드릴까요?
    </h1>

    <UChatPrompt
      v-model="prompt"
      variant="soft"
      :loading="loading"
      class="w-full mt-4"
      @submit="onSubmit"
    >
      <template v-if="files.length > 0" #header>
        <div class="flex flex-wrap gap-2">
          <FileAvatar
            v-for="fileWithStatus in files"
            :key="fileWithStatus.id"
            :name="fileWithStatus.file.name"
            :type="fileWithStatus.file.type"
            :preview-url="fileWithStatus.previewUrl"
            :status="fileWithStatus.status"
            :error="fileWithStatus.error"
            removable
            @remove="removeFile(fileWithStatus.id)"
          />
        </div>
      </template>
      <template #footer>
        <div class="flex items-center gap-1">
          <ChatFileUploadButton @files-selected="addFiles($event)" />
          <ChatModelSelect v-model="model" />
        </div>
        <UChatPromptSubmit
          :status="loading ? 'submitted' : 'ready'"
          :disabled="isUploading"
          color="neutral"
          class="rounded-full"
        />
      </template>
    </UChatPrompt>
  </div>
</template>

<style scoped>

</style>
