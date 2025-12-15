export type ConversationStatus = 'PENDING' | 'COMPLETED' | 'FAILED'

export interface Conversation {
  project_code: string
  user_code: string | null
  code: string
  subject: string
  status: ConversationStatus
  created_at: Date
  updated_at: Date
}
