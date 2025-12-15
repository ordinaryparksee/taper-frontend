export interface File {
  id: string
  namespace: string
  driver: 'S3' | 'LOCAL'
  name: string
  type: string
  size: number
  path: string
  status: 'PENDING' | 'UPLOADING' | 'UPLOADED' | 'COMPLETED'
  expires_at: Date | null
  expired_at: Date | null
  created_at: Date
  updated_at: Date
}
