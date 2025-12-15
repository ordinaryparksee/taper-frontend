export type KnowledgeSplitMode = 'PAGE_BASE' | 'CONTEXT_BASE' | null

export interface Knowledge {
  id: number
  project_code: string
  connection_code: string | null
  embedding_model_credential_code: string | null
  code: string
  name: string
  embedding_model: string
  embedding_dimension: number
  chunk_strategy: 'CHAR_SPLIT' | 'RECURSIVE_CHAR_SPLIT'
  chunk_size: number
  chunk_overlap: number
  language: string | null
  split_mode: KnowledgeSplitMode
  created_at: Date
  updated_at: Date
}

export type KnowledgeFileStatus = 'SCHEDULED' | 'STARTED' | 'LOADING'
  | 'CHUNKING' | 'CHUNKING_FAILED'
  | 'EMBEDDING' | 'EMBEDDING_FAILED'
  | 'COMPLETED' | 'FAILED'

export interface KnowledgeFile {
  knowledge_code: string
  file_id: string
  file_name: string
  file_size: number
  file_type: string
  flow_run_id: string | null
  sha256_hash: string | null
  split_mode: KnowledgeSplitMode
  status: KnowledgeFileStatus
  started_at: Date | null
  chunk_total: number | null
  chunk_completed: number | null
  chunk_failed: number | null
  embedding_completed: number | null
  embedding_failed: number | null
  transfer_completed: number | null
  transfer_failed: number | null
  chunk_started_at: Date | null
  chunk_completed_at: Date | null
  embedding_started_at: Date | null
  embedding_completed_at: Date | null
  completed_at: Date | null
  failed_at: Date | null
  error_message: string | null
}

export interface KnowledgeRetrievedItem {
  project_code: string
  knowledge_code: string
  file_id: string
  chunk_content: string
  chunk_number: number
  embedding_model: string
  metadata?: {
    file_name?: string
    [key: string]: unknown
  }
  score: number
}
