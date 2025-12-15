export interface BaseResponse<T> {
  data: T
}

export interface ListResponse<T> {
  data: T[]
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}
