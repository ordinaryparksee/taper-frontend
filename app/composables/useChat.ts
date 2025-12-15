function convertMessages(chats: Chat[]): MultiModalChatMessage[] {
  const messages: MultiModalChatMessage[] = []

  let index = 0
  for (const chat of chats) {
    messages.push({
      id: `user-${index}`,
      role: 'user',
      parts: [
        {
          type: 'text',
          text: chat.prompt
        }
      ]
    })
    messages.push({
      id: `assistant-${index}`,
      role: 'assistant',
      parts: [
        {
          type: 'text',
          text: chat.completion || ''
        }
      ]
    })
    index++
  }

  return messages
}

export function useChat(conversationCode?: string | null) {
  const config = useRuntimeConfig()
  const { $api } = useNuxtApp()
  const { project } = useProject()
  const { session } = useUserSession()
  const { model } = useModels('chat')

  const _conversationCode = ref(conversationCode)
  const messages = ref<MultiModalChatMessage[]>([])
  const prompt = ref('')
  const loading = ref(false)
  const streaming = ref(false)
  const streamingMode = ref(true)
  const statefulMode = ref(true)
  const error = ref<Error>()
  const currentStreamId = ref<string | null>(null)
  const abortController = ref<AbortController | null>(null)

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
    execute().then(() => {
      messages.value = convertMessages(data.value)
    })
  }

  async function create() {
    const response = await $api<Conversation>(`/conversations`, {
      method: 'POST',
      params: {
        project_code: project.value?.code
      }
    })
    _conversationCode.value = response.code
    return response
  }

  async function fetchChatResponse() {
    loading.value = true
    abortController.value = new AbortController()

    try {
      // 백엔드 API 형식에 맞게 메시지 변환
      let apiMessages: MultiModalChatMessage[] = messages.value.map(message => ({
        id: message.id,
        role: message.role,
        parts: message.parts
      }))

      if (statefulMode.value) {
        // Stateful 모드일 경우 마지막 사용자 메시지만 전달 (백엔드에서 재구성)
        const lastUserMessage = [...apiMessages].reverse().find(m => m.role === 'user')
        apiMessages = lastUserMessage ? [lastUserMessage] : []
      }

      if (streamingMode.value) {
        streaming.value = false
        const assistantMessageId = crypto.randomUUID()
        const streamId = crypto.randomUUID()
        currentStreamId.value = streamId

        const response = await fetch(`${config.public.apiBase}/chat/stream?project_code=${project.value?.code}&conversation_code=${_conversationCode.value}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.value?.token}`
          },
          body: JSON.stringify({
            model: model.value || 'openrouter/x-ai/grok-4.1-fast',
            messages: apiMessages,
            stateful: statefulMode.value,
            stream_id: streamId
          }),
          signal: abortController.value.signal
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
                  const content = parsed.choices?.[0]?.delta?.content || ''
                  if (content) {
                    if (!streaming.value) {
                      messages.value.push({
                        id: assistantMessageId,
                        role: 'assistant',
                        parts: [{ type: 'text', text: '' }]
                      })
                    }
                    streaming.value = true
                    const msgIndex = messages.value.findIndex(m => m.id === assistantMessageId)
                    if (msgIndex !== -1 && messages.value[msgIndex]?.parts?.[0]) {
                      messages.value[msgIndex].parts[0].text += content
                    }
                  }
                } catch (e) {
                  console.error('Error parsing stream chunk', e)
                }
              }
            }
          }
        }
        streaming.value = false
        currentStreamId.value = null
      } else {
        const streamId = crypto.randomUUID()
        currentStreamId.value = streamId
        const response = await $api<ChatCompletionResponse>(`/chat`, {
          method: 'POST',
          params: {
            project_code: project.value?.code,
            conversation_code: _conversationCode.value
          },
          body: {
            model: model.value || 'openrouter/x-ai/grok-4.1-fast',
            messages: apiMessages,
            stateful: statefulMode.value,
            stream_id: streamId
          },
          signal: abortController.value.signal
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
        currentStreamId.value = null
      }
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

  async function send(options?: { files?: { type: 'file', file_id: string }[] }) {
    if ((!prompt.value.trim() && (!options?.files || options.files.length === 0)) || loading.value) return

    if (!_conversationCode.value) {
      await create()
    }

    error.value = undefined
    const parts: ChatMessagePart[] = []

    if (prompt.value.trim()) {
      parts.push({
        type: 'text',
        text: prompt.value.trim()
      })
    }

    if (options?.files) {
      for (const file of options.files) {
        parts.push({
          type: file.type,
          file_id: file.file_id
        })
      }
    }

    const userMessage: MultiModalChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      parts
    }

    messages.value.push(userMessage)
    prompt.value = ''

    await fetchChatResponse()
  }

  async function regenerate() {
    if (loading.value) return

    // 마지막 메시지가 에러 메시지인 경우 제거 (onSubmit에서 에러 시 추가한 메시지)
    if (error.value && messages.value.length > 0 && messages.value[messages.value.length - 1]?.role === 'assistant') {
      messages.value.pop()
    }

    error.value = undefined
    await fetchChatResponse()
  }

  async function stop() {
    if (abortController.value) {
      abortController.value.abort()
    }

    if (currentStreamId.value) {
      try {
        await $fetch('/chat/stop', {
          method: 'POST',
          body: {
            stream_id: currentStreamId.value
          },
          baseURL: config.public.apiBase
        })
      } catch (e) {
        console.error('Failed to stop chat completion:', e)
      } finally {
        currentStreamId.value = null
      }
    }
    streaming.value = false
  }

  return {
    conversationCode: _conversationCode,
    chats: messages,
    prompt,
    loading,
    streaming,
    streamingMode,
    statefulMode,
    status,
    error,
    create,
    send,
    regenerate,
    stop
  }
}
