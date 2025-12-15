import type { ChatMessagePart } from '#shared/types/chat'

export interface Chat {
  id: number
  project_code: string
  conversation_code: number
  knowledge_code: string | null
  user_code: number
  credential_code: string | null
  model: string
  temperature: number
  prompt: string
  completion: string | null
  input_parts: ChatMessagePart[]
  output_parts: ChatMessagePart[]
  error_message: string | null
  prompt_tokens: number | null
  completion_tokens: number | null
  total_tokens: number | null
  created_at: Date
  updated_at: Date
}

export interface Conversation {
  project_code: string
  user_code: string | null
  code: string
  subject: string
  created_at: Date
  updated_at: Date
}
