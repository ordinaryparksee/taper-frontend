export type ChatRole = 'system' | 'user' | 'assistant'

export interface ChatMessagePart {
  type: 'text' | 'reasoning' | 'file'
  text?: string
  file_id?: string
  file_url?: {
    url: string
    mediaType?: string
  }
  // For compatibility with ai/UIMessagePart
  data?: unknown
}

export interface MultiModalChatMessage {
  id: string
  role: ChatRole
  parts: ChatMessagePart[]
}

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
}

export interface ChatCompletionRequest {
  model: string
  messages: ChatMessage[] | MultiModalChatMessage[]
  temperature?: number
}

export interface ChatCompletionChoiceMessage {
  role: ChatRole
  content: string | null
  reasoning?: string | null
  refusal?: string | null
  tool_calls?: unknown[] | null
  function_call?: unknown | null
}

export interface ChatCompletionChoice {
  index: number
  message: ChatCompletionChoiceMessage
  finish_reason: string | null
}

export interface ChatCompletionUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  reasoning_tokens?: number | null
}

export interface ChatCompletionResponse {
  id: string
  object: string
  created: number
  model: string
  choices: ChatCompletionChoice[]
  usage?: ChatCompletionUsage | null
}

export interface ChatCompletionStreamDelta {
  role?: string | null
  content?: string | null
  reasoning?: string | null
  tool_calls?: unknown[] | null
  function_call?: unknown | null
}

export interface ChatCompletionStreamChoice {
  index: number
  delta: ChatCompletionStreamDelta
  finish_reason: string | null
}

export interface ChatCompletionStreamResponse {
  id: string
  object: string
  created: number
  model: string
  choices: ChatCompletionStreamChoice[]
  usage?: ChatCompletionUsage | null
}
