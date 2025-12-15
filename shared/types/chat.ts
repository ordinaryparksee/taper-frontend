import type { UIMessagePart, UIDataTypes, UITools } from 'ai'
import type { File } from './file'

export type ChatRole = 'system' | 'user' | 'assistant'
export type ChatStatus = 'PENDING' | 'COMPLETED' | 'FAILED'
export type MessageMetadata = { id: string, status: ChatStatus }

export interface Chat {
  id: string
  project_code: string
  conversation_code: number
  knowledge_code: string | null
  user_code: number
  credential_code: string | null
  stream_id: string
  model: string
  options: {
    temperature: number
    top_p: number
    window_size: number
  }
  prompt: string
  completion: string | null
  input_parts: UIMessagePart<UIDataTypes, UITools>[]
  output_parts: UIMessagePart<UIDataTypes, UITools>[]
  error_message: string | null
  prompt_tokens: number | null
  completion_tokens: number | null
  total_tokens: number | null
  status: ChatStatus
  files: File[]
  created_at: Date
  updated_at: Date
}
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

export interface ChatMessage {
  id: string
  role: ChatRole
  content?: string
  file_ids?: string[]
  chat_id?: string
  status?: ChatStatus
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

export class ChatError extends Error {
  code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.code = code || 'E_UNKNWON'
  }
}
