import { z } from 'zod'

export type KnowledgeSplitMode = 'PAGE_BASE' | 'CONTEXT_BASE' | null

const Knowledge = z.object({
  id: z.string(),
  project_id: z.string(),
  connection_id: z.string().nullable(),
  embedding_model_credential_id: z.string().nullable(),
  name: z.string(),
  embedding_model: z.string(),
  embedding_dimension: z.number(),
  chunk_strategy: z.enum(['CHAR_SPLIT', 'RECURSIVE_CHAR_SPLIT']),
  chunk_size: z.number(),
  chunk_overlap: z.number(),
  language: z.string().nullable(),
  split_mode: z.enum(['PAGE_BASE', 'CONTEXT_BASE']).nullable(),
  created_at: z.string(),
  updated_at: z.string()
}).register(z.globalRegistry, {
  id: 'Knowledge'
})
export type KnowledgeType = z.infer<typeof Knowledge>
export const KnowledgeSchema = Knowledge.toJSONSchema()

export type KnowledgeFileStatus = 'SCHEDULED' | 'STARTED' | 'LOADING'
  | 'CHUNKING' | 'CHUNKING_FAILED'
  | 'EMBEDDING' | 'EMBEDDING_FAILED'
  | 'COMPLETED' | 'FAILED'

const KnowledgeFile = z.object({
  knowledge_id: z.string(),
  file_id: z.string(),
  file_name: z.string(),
  file_size: z.number(),
  file_type: z.string(),
  flow_run_id: z.string().nullable(),
  sha256_hash: z.string().nullable(),
  split_mode: z.enum(['PAGE_BASE', 'CONTEXT_BASE']).nullable(),
  status: z.enum(['SCHEDULED', 'STARTED', 'LOADING', 'CHUNKING', 'CHUNKING_FAILED', 'EMBEDDING', 'EMBEDDING_FAILED', 'COMPLETED', 'FAILED']),
  started_at: z.string().nullable(),
  chunk_total: z.number().nullable(),
  chunk_completed: z.number().nullable(),
  chunk_failed: z.number().nullable(),
  embedding_completed: z.number().nullable(),
  embedding_failed: z.number().nullable(),
  transfer_completed: z.number().nullable(),
  transfer_failed: z.number().nullable(),
  chunk_started_at: z.string().nullable(),
  chunk_completed_at: z.string().nullable(),
  embedding_started_at: z.string().nullable(),
  embedding_completed_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  failed_at: z.string().nullable(),
  error_message: z.string().nullable()
}).register(z.globalRegistry, {
  id: 'KnowledgeFile'
})

export type KnowledgeFileType = z.infer<typeof KnowledgeFile>
export const KnowledgeFileSchema = KnowledgeFile.toJSONSchema()

const KnowledgeRetrievedItem = z.object({
  project_id: z.string(),
  knowledge_id: z.string(),
  file_id: z.string(),
  chunk_content: z.string(),
  chunk_number: z.number(),
  embedding_model: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  score: z.number()
}).register(z.globalRegistry, {
  id: 'KnowledgeRetrievedItem'
})
export type KnowledgeRetrievedItemType = z.infer<typeof KnowledgeRetrievedItem>
export const KnowledgeRetrievedItemSchema = KnowledgeRetrievedItem.toJSONSchema()
