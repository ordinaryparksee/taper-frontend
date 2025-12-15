import type { AvatarProps } from '#ui/types'

export function formatModelName(modelId: string): string {
  const acronyms = ['gpt'] // words that should be uppercase
  const modelName = modelId.split('/')[1] || modelId

  return modelName
    .split('-')
    .map((word) => {
      const lowerWord = word.toLowerCase()
      return acronyms.includes(lowerWord)
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

export function detectIcon(_model?: string | null): string | undefined {
  if (!_model) return undefined

  const segments = _model.split('/')
  const provider = segments[0] === 'openrouter' ? segments[1] : segments[0]
  if (provider === 'x-ai' || provider === 'voyage') {
    return undefined
  } else {
    return `i-simple-icons-${provider}`
  }
}

export function detectAvatar(_model?: string | null): AvatarProps | undefined {
  if (!_model) return undefined

  const segments = _model.split('/')
  const provider = segments[0] === 'openrouter' ? segments[1] : segments[0]
  if (provider === 'x-ai') {
    return {
      src: '/icon/xAI_Logomark_Dark.svg',
      ui: {
        root: 'bg-transparent'
      }
    }
  } else if (provider === 'voyage') {
    return {
      src: '/icon/voyage.svg',
      ui: {
        root: 'bg-transparent'
      }
    }
  } else {
    return undefined
  }
}

export function useModels(type?: 'chat' | 'embedding' | 'rerank' | null) {
  const allModels = useState<Model[]>('all_models', () => [])
  const chatModels = useState<Model[]>('chat_models', () => [])
  const embeddingModels = useState<Model[]>('embedding_models', () => [])
  const rerankModels = useState<Model[]>('rerank_models', () => [])

  let rawModels = allModels
  if (type === 'chat') {
    rawModels = chatModels
  } else if (type === 'embedding') {
    rawModels = embeddingModels
  } else if (type === 'rerank') {
    rawModels = rerankModels
  }

  if (rawModels.value.length === 0) {
    const { data } = useApi<Model[]>(`/models`, {
      params: {
        type
      },
      default: () => [] as Model[]
    })

    watch(data, (newData) => {
      if (newData && newData.length > 0) {
        rawModels.value = newData
      }
    }, { immediate: true })
  }

  const models = computed(() =>
    rawModels.value?.map(m => `${m.provider}/${m.model}`)
  )

  const model = useCookie<string>('model', {
    default: () => 'openrouter/x-ai/grok-4.1-fast'
  })

  return {
    rawModels,
    models,
    model,
    formatModelName,
    detectIcon,
    detectAvatar
  }
}
