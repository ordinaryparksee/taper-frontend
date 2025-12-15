export type CredentialType = 'BASIC_AUTH' | 'API_KEY' | 'SSH' | 'HTTP_HEADER'

export interface Credential {
  project_code: string
  code: string
  name: string
  type: CredentialType
  data: Record<string, unknown>
  created_at: Date
  updated_at: Date
}
