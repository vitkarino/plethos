declare module 'h3' {
  interface H3EventContext {
    requestId?: string
    auth?: {
      enabled: boolean
      token: string | null
      userId: string | null
    }
  }
}

export {}
