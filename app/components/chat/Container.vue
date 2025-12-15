<script setup lang="ts">
import type { UIMessage } from 'ai'
import type { DefineComponent } from 'vue'
import { getTextFromMessage } from '#ui/utils/ai'
import { useClipboard } from '@vueuse/core'
import ChatStreamPre from '~/components/chat/PreStream.vue'

const props = withDefaults(defineProps<{
  projectCode: string
  conversationCode: string
  welcomeMessage?: string
}>(), {
  welcomeMessage: 'How are you today?'
})

const components = {
  pre: ChatStreamPre as unknown as DefineComponent
}

const { model, rawModels } = useModels('chat')
const clipboard = useClipboard()
const {
  chats,
  prompt,
  loading,
  streamingMode,
  statefulMode,
  status,
  error,
  regenerate,
  stop,
  send
} = useChat(props.conversationCode)

const {
  files,
  isUploading,
  uploadedFiles,
  addFiles,
  removeFile,
  clearFiles
} = useChatUpload(props.conversationCode)

const copied = ref(false)
const windowSize = ref(20)

const selectedModel = computed(() => {
  return rawModels.value.find(m => `${m.provider}/${m.model}` === model.value)
})

const canUpload = computed(() => {
  return selectedModel.value?.modality.some(m => ['image', 'audio', 'video'].includes(m))
})

async function handleSubmit() {
  const uploadFiles = uploadedFiles.value.map(file => ({
    type: 'file' as const,
    file_id: file.id
  }))

  await send({ files: uploadFiles })
  clearFiles()
}

function copy(e: MouseEvent, message: UIMessage) {
  clipboard.copy(getTextFromMessage(message))

  copied.value = true

  setTimeout(() => {
    copied.value = false
  }, 2000)
}
</script>

<template>
  <UContainer
    :class="['flex-1 flex flex-col gap-4 sm:gap-6 overflow-y-auto', chats.length > 0 ? '' : 'justify-center items-center']"
  >
    <UChatMessages
      v-if="chats.length > 0"
      should-auto-scroll
      :status="status"
      :auto-scroll="{
        color: 'neutral',
        variant: 'outline'
      }"
      :messages="(chats as UIMessage[])"
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
            icon: copied ? 'i-lucide-copy-check' : 'i-lucide-copy',
            onClick: copy
          }
        ]
      }"
      :spacing-offset="160"
      :ui="{
        autoScroll: 'bottom-[40px]'
      }"
      class="lg:pt-(--ui-header-height) pb-4 sm:pb-6"
    >
      <template #content="{ message }">
        <template
          v-for="(part, index) in (message.parts as any[])"
          :key="`${message.id}-${part.type}-${index}${'state' in part ? `-${part.state}` : ''}`"
        >
          <ChatReasoning
            v-if="part.type === 'reasoning'"
            :text="part.text"
            :is-streaming="part.state !== 'done'"
          />
          <MDCCached
            v-else-if="part.type === 'text'"
            :value="part.text || ''"
            :cache-key="`${message.id}-${index}`"
            :components="components"
            :parser-options="{ highlight: false }"
            class="*:first:mt-0 *:last:mb-0"
          />
          <div v-else-if="part.type === 'file'" class="my-2">
            <template v-if="part.file_url?.mediaType?.startsWith('image/')">
              <img :src="part.file_url.url" class="max-w-md rounded-lg">
            </template>
            <UButton
              v-else
              :to="part.file_url?.url"
              target="_blank"
              icon="i-lucide-file"
              color="neutral"
              variant="subtle"
            >
              파일 보기
            </UButton>
          </div>
        </template>
      </template>
    </UChatMessages>

    <h1 v-else class="text-2xl font-bold mb-8">
      {{ props.welcomeMessage }}
    </h1>

    <UChatPrompt
      v-model="prompt"
      variant="soft"
      :loading="loading"
      :error="error"
      class="sticky bottom-5 [view-transition-name:chat-prompt] shadow-xs"
      @submit="handleSubmit"
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
          <ChatFileUploadButton
            v-if="canUpload"
            :modalities="selectedModel?.modality ?? []"
            @files-selected="addFiles($event)"
          />
          <ChatModelSelect v-model="model" />
        </div>
        <div class="flex items-center gap-2">
          <UPopover
            arrow
            :content="{ side: 'top' }"
          >
            <UButton
              icon="i-lucide-settings"
              variant="ghost"
              color="neutral"
            />
            <template #content>
              <div class="flex flex-col gap-4 p-4">
                <div class="flex items-center gap-2">
                  <USwitch v-model="streamingMode" label="Streaming" size="sm" />
                </div>
                <div class="flex items-center gap-2">
                  <USwitch v-model="statefulMode" label="Stateful" size="sm" />
                </div>
                <UFormField label="Window size" size="sm">
                  <UInput
                    v-model.number="windowSize"
                    type="number"
                    placeholder="Default 20"
                  />
                </UFormField>
              </div>
            </template>
          </UPopover>
          <UChatPromptSubmit
            :status="status"
            :disabled="isUploading"
            error-icon="i-lucide-rotate-ccw"
            color="neutral"
            class="rounded-full"
            @stop="stop"
            @reload="regenerate"
          />
        </div>
      </template>
    </UChatPrompt>
  </UContainer>
</template>

<style scoped>

</style>
