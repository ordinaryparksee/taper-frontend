import type { UIMessage, UIMessagePart, UIDataTypes, UITools } from 'ai'
import type { FileWithStatus } from '#shared/utils/file'
import { FILE_UPLOAD_CONFIG } from '#shared/utils/file'
import { useEventSource } from '@vueuse/core'

export function useChat(conversationCode?: string | null) {
  const config = useRuntimeConfig()
  const { $api } = useNuxtApp()
  const { project } = useProject()
  const { session } = useUserSession()
  const { model } = useModels('chat')
  const toast = useToast()

  const _conversationCode = ref(conversationCode)
  const messages = ref<UIMessage<MessageMetadata>[]>([])
  const prompt = ref('')
  const loading = ref(false)
  const streaming = ref(false)
  const streamingMode = ref(true)
  const statefulMode = ref(true)
  const credentialCode = ref<string | null>(null)
  const knowledgeCodes = ref<string[]>([])
  const temperature = ref(0.7)
  const topP = ref(1.0)
  const windowSize = ref(20)
  const error = ref<Error>()
  const streamId = ref<string | null>(null)
  const lastChatId = ref<string>()
  const abortController = ref<AbortController | null>(null)

  const files = ref<FileWithStatus[]>([])

  const status = computed(() => {
    if (error.value) return 'error'
    return streaming.value ? 'streaming' : loading.value ? 'submitted' : 'ready'
  })

  if (_conversationCode.value) {
    const { data, execute } = useApi<Chat[]>(`/conversations/${_conversationCode.value}/messages`, {
      params: {
        project_code: project.value?.code,
        conversation_code: _conversationCode.value
      },
      immediate: false
    })
    execute().then(async () => {
      const chats = data.value
      credentialCode.value = chats[chats.length - 1]?.credential_code || null
      knowledgeCodes.value = chats[chats.length - 1]?.knowledge_codes || []

      messages.value = []
      for (const chat of chats) {
        messages.value.push(convertChatToUserMessage(chat))
        messages.value.push(convertChatToAssistantMessage(chat))
        lastChatId.value = chat.id
      }

      const lastChat = data.value[data.value.length - 1]
      if (lastChat?.status === 'FAILED') {
        error.value = new Error('Chat failed')
      }

      if (lastChat?.status === 'PENDING') {
        await stream(lastChat)
      }
    })
  }

  async function newConversation(): Promise<Conversation> {
    const response = await $api<Conversation>(`/conversations`, {
      method: 'POST',
      params: {
        project_code: project.value?.code
      }
    })
    _conversationCode.value = response.code
    return response
  }

  function convertChatToUserMessage(chat: Chat): UIMessage<MessageMetadata> {
    const parts: UIMessagePart<UIDataTypes, UITools>[] = []

    parts.push({
      type: 'text',
      text: chat.prompt
    })

    for (const file of chat.files) {
      parts.push({
        type: 'file',
        mediaType: file.type,
        filename: file.name,
        url: `${config.public.apiBase}/files/thumbnail/${file.id}`
      })
    }

    const userMessage: UIMessage<MessageMetadata> = {
      id: `user-${chat.id}`,
      role: 'user',
      parts,
      metadata: {
        id: chat.id,
        status: chat.status
      }
    }

    return userMessage
  }

  function convertChatToAssistantMessage(chat: Chat): UIMessage<MessageMetadata> {
    const parts: UIMessagePart<UIDataTypes, UITools>[] = []

    parts.push({
      type: 'text',
      text: chat.completion || ''
    })

    const assistantMessage: UIMessage<MessageMetadata> = {
      id: `assistant-${chat.id}`,
      role: 'assistant',
      parts,
      metadata: {
        id: chat.id,
        status: chat.status
      }
    }

    return assistantMessage
  }

  function getUserMessage(chatId?: string | null): UIMessage<MessageMetadata> | null {
    return messages.value.find(message => message.id === `user-${chatId}`) as UIMessage<MessageMetadata>
  }

  function getAssistantMessage(chatId?: string | null): UIMessage<MessageMetadata> | null {
    return messages.value.find(message => message.id === `assistant-${chatId}`) as UIMessage<MessageMetadata>
  }

  function removeUserMessage(chatId?: string | null) {
    const index = messages.value.findIndex(message => message.id === `user-${chatId}`)
    if (index !== -1) {
      messages.value.splice(index, 1)
    }
  }

  function removeAssistantMessage(chatId?: string | null) {
    const index = messages.value.findIndex(message => message.id === `assistant-${chatId}`)
    if (index !== -1) {
      messages.value.splice(index, 1)
    }
  }

  function setTextPart(message: UIMessage<MessageMetadata>, text: string) {
    if (!text) return

    let part = message.parts.find(part => part.type === 'text')
    if (!part) {
      part = {
        type: 'text',
        text: ''
      }
      message.parts.push(part)
    }

    part.text = text
  }

  function setReasoningPart(message: UIMessage<MessageMetadata>, text: string) {
    if (!text) return

    let part = message.parts.find(part => part.type === 'reasoning')
    if (!part) {
      part = {
        type: 'reasoning',
        text: ''
      }
      message.parts.push(part)
    }

    part.text = text
  }

  function setKnowledgePart(message: UIMessage<MessageMetadata>, knowledges: KnowledgeRetrievalItem[]) {
    if (!knowledges) return

    let part = message.parts.find(part => part.type === 'data-knowledge')
    if (!part) {
      part = {
        type: 'data-knowledge',
        data: []
      }
      message.parts.push(part)
    }

    part.data = knowledges
  }

  async function handleChat(handler: () => Promise<Chat>, chatId?: string | null) {
    error.value = undefined
    loading.value = true

    try {
      return await handler()
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Chat response aborted')
        return
      }

      console.error('Failed to fetch chat completion:', err)
      error.value = err instanceof Error ? err : new Error(String(err))

      if (!chatId) {
        chatId = lastChatId.value || crypto.randomUUID()
      }

      const message = getAssistantMessage(chatId) || {
        id: `assistant-${chatId}`,
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: '죄송합니다. 오류가 발생했습니다. 다시 시도해 주세요.'
          }
        ],
        metadata: {}
      }

      message.metadata = {
        id: chatId,
        status: 'FAILED'
      }
    }
  }

  async function prepareCompletion(message: string, fileIds: string[] = []): Promise<Chat> {
    if (message.length < 1) {
      throw new Error('Prompt is required')
    }

    const chat = await $api<Chat>(`/chat`, {
      method: 'POST',
      params: {
        project_code: project.value?.code,
        conversation_code: _conversationCode.value
      },
      body: {
        model: model.value || 'openrouter/x-ai/grok-4.1-fast',
        credential_code: credentialCode.value,
        knowledge_codes: knowledgeCodes.value,
        message: {
          content: message,
          file_ids: fileIds
        },
        stateful: statefulMode.value,
        streaming: streamingMode.value,
        options: {
          temperature: temperature.value,
          top_p: topP.value,
          window_size: windowSize.value
        }
      },
      signal: abortController.value?.signal
    })

    const userMessage: UIMessage<MessageMetadata> = convertChatToUserMessage(chat)
    messages.value.push(userMessage)

    return chat
  }

  async function prepareRegenerate(chatId: string) {
    const chat = await $api<Chat>(`/chat/${chatId}`, {
      method: 'PUT',
      params: {
        project_code: project.value?.code,
        conversation_code: _conversationCode.value
      },
      body: {
        stateful: statefulMode.value,
        streaming: streamingMode.value
      },
      signal: abortController.value?.signal
    })

    return chat
  }

  async function stream(chat: Chat) {
    if (!chat.stream_id) return

    streamId.value = chat.stream_id
    streaming.value = false

    let assistantMessage: UIMessage<MessageMetadata> | null = getAssistantMessage(chat.id)

    return new Promise((resolve, reject) => {
      const { eventSource, close } = useEventSource(`${config.public.apiBase}/chat/stream/${streamId.value}?project_code=${project.value?.code}&conversation_code=${_conversationCode.value}`)
      eventSource.value?.addEventListener('message', async (event) => {
        if (!streaming.value) {
          streaming.value = true
          if (assistantMessage) {
            assistantMessage = reactive(assistantMessage)
          } else {
            assistantMessage = reactive(convertChatToAssistantMessage(chat))
            messages.value.push(assistantMessage)
          }
          assistantMessage.parts = [{ type: 'text', text: '' }]
        }

        const operation = JSON.parse(event.data)
        if (operation instanceof Array) {
          for (const op of operation) {
            chat = chatApplyPatch(chat, op).newDocument
          }
        } else {
          chat = chatApplyPatch(chat, JSON.parse(event.data)).newDocument
        }

        chat.reasoning = chat.reasoning_chunks?.join('') || ''
        chat.completion = chat.completion_chunks?.join('') || ''

        if (assistantMessage) {
          setTextPart(assistantMessage, chat.completion)
          setReasoningPart(assistantMessage, chat.reasoning)
          setKnowledgePart(assistantMessage, chat.knowledge_retrieved || [])
        }
      })
      eventSource.value?.addEventListener('error', async (event: Event) => {
        if (event.data) {
          const error = JSON.parse(event.data)
          reject(new ChatError(error.message, error.code))
        } else {
          reject(new ChatError('Unknown error'))
        }
      })
      eventSource.value?.addEventListener('close', async (event) => {
        close()
        streaming.value = false
        streamId.value = null
        const index = messages.value.findIndex(message => message.id === `assistant-${chat.id}`)
        if (index > 0 && messages.value[index]) {
          messages.value[index] = toRaw(messages.value[index])
        }
        resolve(chat)
      })
    })
  }

  async function send() {
    if ((!prompt.value.trim() && uploadedFiles.value.length === 0) || loading.value) return

    if (!_conversationCode.value) {
      await newConversation()
    }

    const message = prompt.value.trim()
    const fileIds = uploadedFiles.value.map(file => file.id)

    prompt.value = ''
    clearFiles()

    abortController.value = new AbortController()

    const chat = await handleChat(async () => {
      const chat = await prepareCompletion(message, fileIds)
      lastChatId.value = chat.id
      await stream(chat)
      return chat
    })

    loading.value = false
    abortController.value = null

    return chat
  }

  async function resend(chatId: string) {
    abortController.value = new AbortController()

    const chat = await handleChat(async () => {
      const chat = await prepareRegenerate(chatId)
      await stream(chat)
      return chat
    }, chatId)

    loading.value = false
    abortController.value = null

    return chat
  }

  async function stop() {
    if (abortController.value) {
      abortController.value.abort()
    }

    if (streamId.value) {
      try {
        await $api(`/chat/stream/${streamId.value}`, {
          method: 'DELETE',
          params: {
            project_code: project.value?.code,
            conversation_code: _conversationCode.value
          }
        })
        // const lastUserMessage = messages.value.findLast(m => m.role === 'user')
        // if (lastUserMessage) {
        //   lastUserMessage.metadata!.status = 'FAILED'
        // }
        // error.value = new Error('Chat stopped by user.')
      } catch (e) {
        console.error('Failed to stop chat completion:', e)
      } finally {
        streamId.value = null
      }
    }
    streaming.value = false
  }

  async function uploadFiles(newFiles: File[]) {
    const filesWithStatus: FileWithStatus[] = newFiles.map(file => ({
      file,
      id: crypto.randomUUID(),
      previewUrl: URL.createObjectURL(file),
      status: 'uploading' as const
    }))

    files.value = [...files.value, ...filesWithStatus]

    for (const fileWithStatus of filesWithStatus) {
      const { upload, uploadId } = useTus({
        endpoint: `${config.public.apiBase}/tus/upload`,
        metadata: {
          namespace: `chat.${_conversationCode.value}`,
          filename: fileWithStatus.file.name,
          filetype: fileWithStatus.file.type
        },
        async onSuccess() {
          const index = files.value.findIndex(f => f.id === fileWithStatus.id)
          if (index !== -1) {
            files.value[index] = {
              ...files.value[index]!,
              status: 'uploaded',
              // uploadedUrl: await fileToBase64(fileWithStatus.file),
              uploadedUrl: `${config.public.apiBase}/files/thumbnail/${uploadId.value}`,
              uploadedPathname: uploadId.value || undefined
            }
          }
        },
        onError(err) {
          const index = files.value.findIndex(f => f.id === fileWithStatus.id)
          const errorMessage = err.message || 'Upload failed'
          if (index !== -1) {
            files.value[index] = {
              ...files.value[index]!,
              status: 'error',
              error: errorMessage
            }
          }
          toast.add({
            title: 'Upload failed',
            description: errorMessage,
            icon: 'i-lucide-alert-circle',
            color: 'error'
          })
        }
      })

      try {
        await upload(fileWithStatus.file)
      } catch (err) {
        console.error('Failed to upload file:', err)
      }
    }
  }

  const { dropzoneRef, isDragging } = useFileUpload({
    accept: FILE_UPLOAD_CONFIG.acceptPattern,
    multiple: true,
    onUpdate: uploadFiles
  })

  function removeFile(id: string) {
    const file = files.value.find(f => f.id === id)
    if (!file) return

    URL.revokeObjectURL(file.previewUrl)
    files.value = files.value.filter(f => f.id !== id)
  }

  function clearFiles() {
    files.value.forEach(f => URL.revokeObjectURL(f.previewUrl))
    files.value = []
  }

  const isUploading = computed(() => files.value.some(f => f.status === 'uploading'))

  const uploadedFiles = computed<FilePart[]>(() =>
    files.value
      .filter(f => f.status === 'uploaded' && f.uploadedUrl)
      .map(f => ({
        type: 'file' as const,
        mediaType: f.file.type,
        filename: f.file.name,
        url: f.uploadedUrl!,
        id: f.uploadedPathname!
      }))
  )

  return {
    conversationCode: _conversationCode,
    messages,
    prompt,
    loading,
    streaming,
    streamingMode,
    statefulMode,
    credentialCode,
    knowledgeCodes,
    temperature,
    topP,
    windowSize,
    status,
    error,
    newConversation,
    send,
    resend,
    stop,
    dropzoneRef,
    isDragging,
    files,
    isUploading,
    uploadedFiles,
    addFiles: uploadFiles,
    removeFile,
    clearFiles,
    lastChatId,
    convertChatToUserMessage,
    convertChatToAssistantMessage,
    getUserMessage,
    getAssistantMessage,
    removeUserMessage,
    removeAssistantMessage
  }
}
