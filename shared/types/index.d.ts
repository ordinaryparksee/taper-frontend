export * from './user'
export * from './file'
export * from './model'
export * from './project'
export * from './connection'
export * from './knowledge'
export * from './credential'
export * from './conversation'
export * from './chat'

export interface PaginatedList<T> {
  items: T[]
  total: number
}
