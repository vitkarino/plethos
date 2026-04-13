export interface ApiPagination {
  limit: number
  offset: number
  total: number
}

export interface ApiMeta {
  requestId: string
  timestamp: string
  pagination?: ApiPagination
}

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    details?: unknown
  }
  meta: ApiMeta
}

export interface ListResult<T> {
  items: T[]
  total: number
}
