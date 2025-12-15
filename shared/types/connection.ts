export type ConnectionDriver = 'OPENSEARCH' | 'PGVECTOR' | 'POSTGRESQL' | 'SSH' | 'MYSQL' | 'PROXY'

export interface ConnectionSchema {
  id: string
  credential_id: string | null
  ssh_tunnel_connection_id: string | null
  proxy_connection_id: string | null
  name: string
  driver: ConnectionDriver
  uri: string
  created_at: Date
  updated_at: Date
}
