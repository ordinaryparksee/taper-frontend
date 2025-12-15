import type { UIMessage, UIMessagePart, UIDataTypes, UITools } from 'ai'
import type { FileWithStatus } from '#shared/utils/file'
import { FILE_UPLOAD_CONFIG } from '#shared/utils/file'

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
  const waitMode = ref(false)
  const credentialCode = ref<string | null>(null)
  const knowledgeCode = ref<string | null>(null)
  const temperature = ref(0.7)
  const topP = ref(1.0)
  const windowSize = ref(20)
  const error = ref<Error>()
  const streamId = ref<string | null>(null)
  const abortController = ref<AbortController | null>(null)

  const files = ref<FileWithStatus[]>([])

  const lastIndex = computed(() => messages.value.length - 1)

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
      messages.value = chatToUIMessages(data.value)

      const lastChat = data.value[data.value.length - 1]
      if (lastChat?.status === 'FAILED') {
        error.value = new Error('Chat failed')
      }

      if (lastChat?.status === 'PENDING') {
        await streamChat(lastChat, true)
      }
    })
  }

  function chatToUIMessages(chats: Chat[]): UIMessage<MessageMetadata>[] {
    const messages: UIMessage<MessageMetadata>[] = []

    credentialCode.value = chats[chats.length - 1]?.credential_code || null
    knowledgeCode.value = chats[chats.length - 1]?.knowledge_code || null

    for (const chat of chats) {
      const userParts: UIMessagePart<UIDataTypes, UITools>[] = [
        {
          type: 'text',
          text: chat.prompt
        }
      ]

      if (chat.files && chat.files.length > 0) {
        for (const file of chat.files) {
          userParts.push({
            type: 'file',
            mediaType: file.type,
            filename: file.name,
            url: `${config.public.apiBase}/files/thumbnail/${file.id}`
          })
        }
      }

      messages.push({
        id: `user-${chat.id}`,
        role: 'user',
        parts: userParts,
        metadata: {
          id: chat.id,
          status: chat.status
        }
      })
      if (chat.completion || chat.status === 'PENDING') {
        messages.push({
          id: `assistant-${chat.id}`,
          role: 'assistant',
          parts: [
            {
              type: 'text',
              text: chat.completion || ''
            }
          ],
          metadata: {
            id: chat.id,
            status: chat.status
          }
        })
      } else if (chat.status === 'FAILED') {
        messages.push({
          id: crypto.randomUUID(),
          role: 'assistant',
          parts: [
            {
              type: 'text',
              text: '죄송합니다. 오류가 발생했습니다. 다시 시도해 주세요.'
            }
          ]
        })
      }
    }

    return messages
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

  async function streamChat(chat: Chat, isReconnect: boolean = false) {
    streamId.value = chat.stream_id
    streaming.value = false
    const promptIndex = messages.value.findIndex(message => message.id === `user-${chat.id}`)
    const completionIndex = (() => {
      const index = messages.value.findIndex(message => message.id === `assistant-${chat.id}`)
      if (index < 0) {
        return promptIndex + 1
      } else {
        return index
      }
    })()
    const assistantMessage: UIMessage<MessageMetadata> = {
      id: `assistant-${chat.id}`,
      role: 'assistant',
      parts: [{ type: 'text', text: chat.completion || '' }],
      metadata: {
        id: chat.id,
        status: chat.status
      }
    }

    if (!isReconnect) {
      // 중간의 메시지를 재생성 할 시에는 UI에서 빈 박스를 표시할수 있도록 메시지 초기화
      if (promptIndex !== lastIndex.value && completionIndex !== lastIndex.value && completionIndex >= 0) {
        messages.value.splice(completionIndex, 1, assistantMessage)
      }

      // 마지막 메시지를 재생성 할 시에는 인디케이터가 표시되므로 박스 제거
      if (completionIndex === lastIndex.value && completionIndex >= 0) {
        messages.value.splice(completionIndex, 1)
      }
    }

    const response = await fetch(`${config.public.apiBase}/chat/stream/${streamId.value}?project_code=${project.value?.code}&conversation_code=${_conversationCode.value}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.value?.token}`
      },
      signal: abortController.value?.signal
    })

    if (!response.ok) throw new Error('Failed to fetch stream')

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No reader')

    const decoder = new TextDecoder()
    let done = false

    while (!done) {
      const { value, done: readerDone } = await reader.read()
      done = readerDone
      if (value) {
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              if (parsed.object === 'chat.completion') {
                const content = parsed.choices?.[0].message.content
                if (promptIndex === lastIndex.value) {
                  messages.value.push(assistantMessage)
                }
                if (messages.value[completionIndex]) {
                  messages.value[completionIndex].parts = [{ type: 'text', text: content }]
                  messages.value[completionIndex].metadata = {
                    id: chat.id,
                    status: chat.status
                  }
                }
              } else if (parsed.object === 'chat.completion.chunk') {
                const content = parsed.choices?.[0]?.delta?.content || ''

                if (content) {
                  if (!streaming.value) {
                    if (promptIndex === lastIndex.value) {
                      messages.value.push(assistantMessage)
                    }
                  }
                  streaming.value = true
                  if (messages.value[completionIndex]?.parts?.[0]?.type === 'text') {
                    messages.value[completionIndex]!.parts[0]!.text += content
                  }
                }
              }
            } catch (e) {
              console.error(`Error parsing stream chunk: ${data}`, e)
            }
          } else if (line.startsWith('error: ')) {
            const data = line.slice(7)
            const error = JSON.parse(data)
            throw new ChatError(error.message, error.code)
          }
        }
      }
    }
    streaming.value = false
    streamId.value = null
  }

  async function chat(userMessage: UIMessage<MessageMetadata>, regenerate: boolean = false) {
    loading.value = true
    abortController.value = new AbortController()

    const fileIds = uploadedFiles.value.map(file => file.id)

    try {
      const chatResponse = await $api<Chat>(regenerate ? `/chat/${userMessage.metadata?.id}` : `/chat`, {
        method: regenerate ? 'PUT' : 'POST',
        params: {
          project_code: project.value?.code,
          conversation_code: _conversationCode.value
        },
        body: {
          model: model.value || 'openrouter/x-ai/grok-4.1-fast',
          credential_code: credentialCode.value,
          knowledge_code: knowledgeCode.value,
          message: {
            content: userMessage.parts.find(part => part.type == 'text')?.text || '',
            file_ids: fileIds
          },
          stateful: statefulMode.value,
          streaming: streamingMode.value,
          wait: waitMode.value,
          options: {
            temperature: temperature.value,
            top_p: topP.value,
            window_size: windowSize.value
          }
        },
        signal: abortController.value.signal
      })

      if (!regenerate) {
        userMessage.id = `user-${chatResponse.id}`
        userMessage.metadata = {
          id: chatResponse.id,
          status: chatResponse.status
        }
        messages.value.push(userMessage)
      }

      const assistantMessage: UIMessage<MessageMetadata> = {
        id: `assistant-${chatResponse.id}`,
        role: 'assistant',
        parts: [{ type: 'text', text: '' }],
        metadata: {
          id: chatResponse.id,
          status: chatResponse.status
        }
      }

      if (waitMode.value) {
        const promptIndex = messages.value.findIndex(message => message.id === userMessage.id)
        const completionIndex = promptIndex + 1
        if (promptIndex === lastIndex.value) {
          messages.value.push(assistantMessage)
        } else {
          messages.value.splice(completionIndex, 0, assistantMessage)
        }
        messages.value[completionIndex]!.parts = [{ type: 'text', text: chatResponse.completion || '' }]
        messages.value[completionIndex]!.metadata = {
          id: chatResponse.id,
          status: chatResponse.status
        }
      } else {
        await streamChat(chatResponse)
      }

      loading.value = false
      abortController.value = null

      return chatResponse
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Chat response aborted')
        return
      }

      console.error('Failed to fetch chat completion:', err)
      error.value = err instanceof Error ? err : new Error(String(err))
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
      abortController.value = null
    }
  }

  async function send() {
    if ((!prompt.value.trim() && uploadedFiles.value.length === 0) || loading.value) return

    if (!_conversationCode.value) {
      await newConversation()
    }

    error.value = undefined
    const parts: UIMessagePart<UIDataTypes, UITools>[] = []

    if (prompt.value.trim()) {
      parts.push({
        type: 'text',
        text: prompt.value.trim()
      })
    }

    if (uploadedFiles.value.length > 0) {
      for (const file of uploadedFiles.value) {
        parts.push(file)
      }
    }

    const userMessage: UIMessage<MessageMetadata> = {
      id: crypto.randomUUID(),
      role: 'user',
      parts
    }
    prompt.value = ''

    const result = await chat(userMessage)
    clearFiles()
    return result
  }

  async function regenerate(message?: UIMessage<MessageMetadata>) {
    if (loading.value) return

    // 전달된 대상 메시지가 없으면 마지막 메시지를 대상으로 함
    if (!message) {
      message = messages.value.findLast(m => m.role === 'user')
    }

    // 메시지의 인덱스 확인
    const messageIndex = messages.value.findIndex(_message => _message.id == message?.id)
    if (messageIndex === -1) return

    // 대상 메시지가 assistant인 경우 이전 메시지(user)로 변경
    let cursor = messageIndex
    while (message?.role === 'assistant') {
      message = messages.value[--cursor]
    }
    if (!message) return

    // 다음 메시지가 assistant인 경우 삭제
    // cursor++
    // while (messages.value[cursor]?.role === 'assistant') {
    //   messages.value.splice(cursor, 1)
    // }
    error.value = undefined

    await chat(message, true)
    prompt.value = ''
  }

  async function stop() {
    if (abortController.value) {
      abortController.value.abort()
    }

    if (streamId.value) {
      try {
        await $api(`/chat/stop/${streamId.value}`, {
          method: 'POST',
          params: {
            project_code: project.value?.code,
            conversation_code: _conversationCode.value
          }
        })
        const lastUserMessage = messages.value.findLast(m => m.role === 'user')
        if (lastUserMessage) {
          lastUserMessage.metadata!.status = 'FAILED'
        }
        error.value = new Error('Chat stopped by user.')
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

  const uploadedFiles = computed(() =>
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
    chats: messages,
    prompt,
    loading,
    streaming,
    streamingMode,
    statefulMode,
    waitMode,
    credentialCode,
    knowledgeCode,
    temperature,
    topP,
    windowSize,
    status,
    error,
    newConversation,
    send,
    regenerate,
    stop,
    dropzoneRef,
    isDragging,
    files,
    isUploading,
    uploadedFiles,
    addFiles: uploadFiles,
    removeFile,
    clearFiles
  }
}
