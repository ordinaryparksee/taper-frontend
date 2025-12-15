export type ConversationStatus = 'PENDING' | 'COMPLETED' | 'FAILED'

export interface ConversationSchema {
  id: string
  project_id: string
  user_id: string | null
  subject: string
  status: ConversationStatus
  created_at: Date
  updated_at: Date
}
