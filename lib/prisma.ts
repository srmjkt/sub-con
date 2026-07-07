import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPool() {
  // Use custom DB_URL env var to bypass Supabase integration's DATABASE_URL override
  // Falls back to DATABASE_URL, then DIRECT_URL
  const connectionString = process.env.DB_URL || process.env.DATABASE_URL || process.env.DIRECT_URL!
  const url = new URL(connectionString)
  return new pg.Pool({
    host: url.hostname,
    port: Number(url.port),
    database: url.pathname.slice(1),
    user: url.username,
    password: decodeURIComponent(url.password),
    // Supabase requires SSL for all connections
    ssl: { rejectUnauthorized: false },
    // Supabase pooler uses PgBouncer which needs this for transaction mode
    max: 1,
    idleTimeoutMillis: 0,
    connectionTimeoutMillis: 10000,
  })
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(createPool()),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma