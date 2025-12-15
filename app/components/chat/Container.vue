<script setup lang="ts">
import type { UIMessage } from 'ai'
import type { DefineComponent } from 'vue'
import { getTextFromMessage } from '#ui/utils/ai'
import { useClipboard } from '@vueuse/core'
import ChatStreamPre from '~/components/chat/PreStream.vue'

const props = withDefaults(defineProps<{
  projectCode: string
  conversationCode?: string
  welcomeMessage?: string
}>(), {
  welcomeMessage: 'How are you today?'
})

const emits = defineEmits<{
  (e: 'onNewConversation', conversationCode: string): void
  (e: 'onChatComplete', chat: Chat): void
}>()

const components = {
  pre: ChatStreamPre as unknown as DefineComponent
}

const { model, rawModels } = useModels('chat')
const clipboard = useClipboard()
const {
  dropzoneRef,
  isDragging,
  conversationCode,
  newConversation,
  messages,
  prompt,
  loading,
  streamingMode,
  statefulMode,
  credentialCode,
  knowledgeCodes,
  temperature,
  topP,
  windowSize,
  status,
  error,
  stop,
  send,
  resend,
  files,
  isUploading,
  addFiles,
  removeFile,
  lastChatId
} = useChat(props.conversationCode)

const copied = ref(false)

const selectedModel = computed(() => {
  return rawModels.value.find(m => `${m.provider}/${m.model}` === model.value)
})

const canUpload = computed(() => {
  return selectedModel.value?.modality.some(m => ['image', 'audio', 'video'].includes(m))
})

async function handleSubmit() {
  if (!conversationCode.value) {
    const conversation = await newConversation()
    emits('onNewConversation', conversation.code)
  }

  const chat = await send()
  if (chat) {
    emits('onChatComplete', chat)
  }
}

function handleRegenerate(e: MouseEvent, message?: UIMessage<MessageMetadata>) {
  if (message?.metadata) {
    resend(message.metadata.id)
  } else if (lastChatId.value) {
    resend(lastChatId.value)
  }
}

function handleCopy(e: MouseEvent, message: UIMessage) {
  clipboard.copy(getTextFromMessage(message))

  copied.value = true

  setTimeout(() => {
    copied.value = false
  }, 2000)
}
</script>

<template>
  <UContainer
    ref="dropzoneRef"
    :class="['flex-1 flex flex-col gap-4 sm:gap-6 overflow-y-auto', messages.length > 0 ? '' : 'justify-center items-center']"
  >
    <DragDropOverlay :show="isDragging" />
    <UChatMessages
      v-if="messages.length > 0"
      should-auto-scroll
      :status="status"
      :auto-scroll="{
        color: 'neutral',
        variant: 'outline'
      }"
      :messages="(messages as UIMessage<MessageMetadata>[])"
      :user="{
        variant: 'soft',
        avatar: {
          src: 'https://github.com/benjamincanac.png'
        },
        actions: [
          {
            label: 'Copy to clipboard',
            icon: copied ? 'i-lucide-copy-check' : 'i-lucide-copy',
            onClick: handleCopy
          },
          {
            label: 'Regenerate',
            icon: 'i-lucide-refresh-ccw',
            onClick: handleRegenerate
          }
        ]
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
            onClick: handleCopy
          },
          {
            label: 'Regenerate',
            icon: 'i-lucide-refresh-ccw',
            onClick: handleRegenerate
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
          <UCollapsible
            v-if="part.type === 'data-knowledge' && part.data.length > 0"
          >
            <UButton
              leading-icon="i-lucide-library"
              variant="subtle"
              color="neutral"
              size="sm"
            >
              참고된 지식
            </UButton>
            <template #content>
              <div class="p-3 text-xs text-muted bg-white rounded-sm">
                <div class="flex flex-col gap-2">
                  <div
                    v-for="(source, sIndex) in part.data"
                    :key="sIndex"
                    class="p-2"
                  >
<!--                    <div class="font-medium mb-1">-->
<!--                      {{ source.name || message.metadata.knowledge?.name || '알 수 없는 문서' }}-->
<!--                    </div>-->
                    <div class="line-clamp-2 opacity-80">
                      {{ source.chunk_content }}
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </UCollapsible>
          <ChatReasoning
            v-else-if="part.type === 'reasoning'"
            :text="part.text"
            :is-streaming="part.state !== 'done'"
          />
          <MDCCached
            v-else-if="part.type === 'text'"
            :value="part.text || ''"
            :cache-key="message.id"
            :components="components"
            :parser-options="{ highlight: false }"
            class="*:first:mt-0 *:last:mb-0"
          />
          <FileAvatar
            v-else-if="part.type === 'file' && part.mediaType.startsWith('image/')"
            :name="part.filename"
            :type="part.mediaType"
            :preview-url="part.url"
            class="mt-2 text-right"
          />
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
                <UFormField label="Temperature" size="sm">
                  <div class="flex items-center gap-4 w-48">
                    <USlider
                      v-model="temperature"
                      :min="0"
                      :max="2"
                      :step="0.1"
                      size="sm"
                    />
                    <span class="text-xs font-mono w-8 text-right">{{ temperature.toFixed(1) }}</span>
                  </div>
                </UFormField>
                <UFormField label="Top Probability(top_p)" size="sm">
                  <div class="flex items-center gap-4 w-48">
                    <USlider
                      v-model="topP"
                      :min="0"
                      :max="1"
                      :step="0.1"
                      size="sm"
                    />
                    <span class="text-xs font-mono w-8 text-right">{{ topP.toFixed(1) }}</span>
                  </div>
                </UFormField>
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
          <ChatFileUploadButton
            v-if="canUpload"
            :modalities="selectedModel?.modality ?? []"
            @files-selected="addFiles($event)"
          />
          <ChatModelSelect v-model="model" />
          <ChatCredentialSelector
            v-model="credentialCode"
            :project-code="props.projectCode"
            class="min-w-30"
          />
          <ChatKnowledgeSelector
            v-model="knowledgeCodes"
            :project-code="props.projectCode"
            multiple
            class="min-w-30"
          />
        </div>
        <div class="flex items-center gap-2">
          <UChatPromptSubmit
            :status="status"
            :disabled="isUploading"
            error-icon="i-lucide-rotate-ccw"
            color="neutral"
            class="rounded-full"
            @stop="stop"
            @reload="handleRegenerate"
          />
        </div>
      </template>
    </UChatPrompt>
  </UContainer>
</template>

<style scoped>

</style>
