import { z } from 'zod'

export const AuthorizationSchema = z.object({
  access_token: z.string(),
  token_type: z.string()
})
export type AuthorizationType = z.infer<typeof AuthorizationSchema>

export const LoginRequestBodySchema = z.object({
  email: z.email(),
  password: z.string().min(8)
})
export type LoginRequestBodyType = z.infer<typeof LoginRequestBodySchema>

export const LoginResponseBodySchema = z.object({
  data: AuthorizationSchema
})
export type LoginResponseBodyType = z.infer<typeof LoginResponseBodySchema>

export const JoinRequestBodySchema = z.object({
  name: z.string(),
  email: z.email(),
  password: z.string().min(8),
  password_confirmation: z.string().min(8)
})
export type JoinRequestBodyType = z.infer<typeof JoinRequestBodySchema>
