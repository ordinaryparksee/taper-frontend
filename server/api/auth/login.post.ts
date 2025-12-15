import { z } from 'zod'

const bodySchema = z.object({
  email: z.email(),
  password: z.string()
})

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const { email, password } = await readValidatedBody(event, bodySchema.parse)

  const response = await fetch(`${config.apiBase}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      password
    })
  })

  if (response.ok) {
    const data = await response.json()

    return await setUserSession(event, {
      user: {
        email: email
      },
      token: data.access_token
    })
  }

  throw createError({
    statusCode: 401,
    message: 'Bad credentials'
  })
})
