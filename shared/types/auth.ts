export interface Authorization {
  access_token: string
  token_type: string
}

export interface LoginRequestBody {
  email: string
  password: string
}

export interface LoginResponseBody {
  data: Authorization
}

export interface JoinRequestBody {
  name: string
  email: string
  password: string
  password_confirmation: string
}
