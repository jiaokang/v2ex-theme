declare module 'cloudflare:workers' {
  import type { LikeDatabase } from './likes-store'

  interface RateLimit {
    limit(options: { key: string }): Promise<{ success: boolean }>
  }

  export const env: {
    DB: LikeDatabase
    LIKE_LIMITER: RateLimit
    LIKE_SECRET?: string
  }
}
