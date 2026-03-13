import { z } from 'zod'
import type { FileUIPart } from 'ai'
import { FileSchema } from '#shared/types/file'
import { KnowledgeSchema, KnowledgeRetrievedItemSchema } from '#shared/types/knowledge'

export const TextUIPartSchema = z.object({
  type: z.literal('text'),
  text: z.string()
})

export const ReasoningUIPartSchema = z.object({
  type: z.literal('reasoning'),
  text: z.string(),
  state: z.enum(['streaming', 'done']).optional()
})

export const FileUIPartSchema = z.object({
  type: z.literal('file'),
  mediaType: z.string(),
  filename: z.string().optional(),
  url: z.string()
})

export const SourceUrlUIPartSchema = z.object({
  type: z.literal('source-url'),
  sourceId: z.string(),
  url: z.string(),
  title: z.string().optional()
})

export const SourceDocumentUIPartSchema = z.object({
  type: z.literal('source-document'),
  sourceId: z.string(),
  mediaType: z.string(),
  title: z.string(),
  filename: z.string().optional()
})

export const UIMessagePartSchema = z.discriminatedUnion('type', [
  TextUIPartSchema,
  ReasoningUIPartSchema,
  FileUIPartSchema,
  SourceUrlUIPartSchema,
  SourceDocumentUIPartSchema
])

export const ChatRole = z.enum(['system', 'user', 'assistant'])
export type ChatRoleType = z.infer<typeof ChatRole>
export const ChatStatus = z.enum(['PENDING', 'COMPLETED', 'FAILED'])
export type ChatStatusType = z.infer<typeof ChatStatus>

export type MessageMetadata = {
  id: string
  status: ChatStatusType
  knowledge?: Record<string, unknown>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

export const ChatSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  conversation_id: z.string(),
  user_id: z.string(),
  credential_id: z.string().nullable(),
  stream_id: z.string(),
  model: z.string(),
  options: z.object({
    temperature: z.number(),
    top_p: z.number(),
    window_size: z.number()
  }),
  prompt: z.string(),
  reasoning: z.string().nullable(),
  completion: z.string().nullable(),
  input_parts: z.array(UIMessagePartSchema),
  output_parts: z.array(UIMessagePartSchema),
  error_message: z.string().nullable(),
  prompt_tokens: z.number().nullable(),
  completion_tokens: z.number().nullable(),
  total_tokens: z.number().nullable(),
  status: ChatStatus,
  metadata: z.object({
    knowledge_retrieved: KnowledgeRetrievedItemSchema.array().nullable()
  }).nullable(),
  files: FileSchema.array(),
  knowledges: KnowledgeSchema.array(),
  created_at: z.string(),
  updated_at: z.string(),
  reasoning_chunks: z.array(z.string()).nullable(),
  completion_chunks: z.array(z.string()).nullable()
})
export type ChatType = z.infer<typeof ChatSchema>

export const ChatMessagePartSchema = z.object({
  type: z.enum(['text', 'reasoning', 'file']),
  text: z.string().nullable(),
  file_id: z.string().nullable(),
  file_url: z.object({
    url: z.string(),
    mediaType: z.string().nullable()
  }).nullable(),
  data: z.unknown().nullable()
})
export type ChatMessagePartType = z.infer<typeof ChatMessagePartSchema>

export const ChatMessageSchema = z.object({
  id: z.string(),
  role: ChatRole,
  content: z.string().nullable(),
  file_ids: z.array(z.string()).nullable(),
  chat_id: z.string().nullable(),
  status: ChatStatus.nullable()
})
export type ChatMessageType = z.infer<typeof ChatMessageSchema>

export const ChatCompletionChoiceMessageSchema = z.object({
  role: ChatRole,
  content: z.string().nullable(),
  reasoning: z.string().nullable(),
  refusal: z.string().nullable(),
  tool_calls: z.array(z.unknown()).nullable(),
  function_call: z.unknown().nullable()
})
export type ChatCompletionChoiceMessageType = z.infer<typeof ChatCompletionChoiceMessageSchema>

export const ChatCompletionChoiceSchema = z.object({
  index: z.number(),
  message: ChatCompletionChoiceMessageSchema,
  finish_reason: z.string().nullable()
})
export type ChatCompletionChoiceType = z.infer<typeof ChatCompletionChoiceSchema>

export const ChatCompletionUsageSchema = z.object({
  prompt_tokens: z.number(),
  completion_tokens: z.number(),
  total_tokens: z.number(),
  reasoning_tokens: z.number().nullable()
})
export type ChatCompletionUsageType = z.infer<typeof ChatCompletionUsageSchema>

export const ChatCompletionResponseSchema = z.object({
  id: z.string(),
  object: z.string(),
  created: z.number(),
  model: z.string(),
  choices: z.array(ChatCompletionChoiceSchema),
  usage: ChatCompletionUsageSchema.nullable()
})
export type ChatCompletionResponseType = z.infer<typeof ChatCompletionResponseSchema>

export interface FilePart extends FileUIPart {
  id: string
}

export class ChatError extends Error {
  code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.code = code || 'E_UNKNWON'
  }
}
