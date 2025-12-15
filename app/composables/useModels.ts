import type { Model } from '~~/shared/types/model'

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

export function useModels(type?: 'chat' | 'embedding' | 'rerank' | null) {
  const rawModels = useState<Model[]>('models', () => [])

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
    formatModelName
  }
}
