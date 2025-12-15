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

export function useModels() {
  const models = [
    'openrouter/x-ai/grok-4.1-fast',
    'openai/gpt-4.1',
    'anthropic/claude-haiku-4.5',
    'google/gemini-2.5-flash'
  ]

  const model = useCookie<string>('model', {
    default: () => 'openrouter/x-ai/grok-4.1-fast'
  })

  return {
    models,
    model,
    formatModelName
  }
}
