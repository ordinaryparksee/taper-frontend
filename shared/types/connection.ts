export interface Connection {
  id: string
  credential_code: string | null
  ssh_tunnel_connection_code: string | null
  proxy_connection_code: string | null
  code: string
  name: string
  driver: 'OPENSEARCH' | 'PGVECTOR' | 'POSTGRESQL' | 'SSH' | 'MYSQL' | 'PROXY'
  uri: string
  created_at: Date
  updated_at: Date
}
