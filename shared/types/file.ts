import { z } from 'zod'

export type FileDriver = 'S3' | 'LOCAL'
export type FileStatus = 'PENDING' | 'UPLOADING' | 'UPLOADED' | 'COMPLETED'

const File =z.object({
  id: z.string(),
  namespace: z.string(),
  driver: z.enum(['S3', 'LOCAL']),
  name: z.string(),
  type: z.string(),
  size: z.number(),
  path: z.string(),
  status: z.enum(['PENDING', 'UPLOADING', 'UPLOADED', 'COMPLETED']),
  expires_at: z.string().nullable(),
  expired_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string()
}).register(z.globalRegistry, {
  id: 'File'
})
export type FileType = z.infer<typeof File>
export const FileSchema = File.toJSONSchema()
