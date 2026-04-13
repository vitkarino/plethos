import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

function getDatabaseUrl(): string {
  return (
    process.env.DATABASE_URL ??
    process.env.NUXT_DATABASE_URL ??
    'postgres://postgres:postgres@127.0.0.1:55432/pulso'
  )
}

function createDatabase() {
  const pool = new Pool({
    connectionString: getDatabaseUrl(),
  })

  const db = drizzle(pool, { schema })

  return { db, pool }
}

const globalForDatabase = globalThis as typeof globalThis & {
  __pulsoDb?: ReturnType<typeof createDatabase>
}

const database = globalForDatabase.__pulsoDb ?? createDatabase()

if (process.env.NODE_ENV !== 'production') {
  globalForDatabase.__pulsoDb = database
}

export const { db, pool } = database
