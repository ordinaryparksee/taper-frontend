export type ConnectionProvider = 'OPENSEARCH' | 'PGVECTOR' | 'POSTGRESQL' | 'SSH' | 'MYSQL' | 'PROXY'

export interface ConnectionSchema {
  id: string
  credential_id: string | null
  ssh_tunnel_connection_id: string | null
  proxy_connection_id: string | null
  name: string
  provider: ConnectionProvider
  uri: string
  created_at: Date
  updated_at: Date
}
