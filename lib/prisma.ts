import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPool() {
  // Prefer DIRECT_URL (port 5432) for Vercel with SSL
  // Falls back to DATABASE_URL (pooler port 6543), then DB_URL
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL || process.env.DB_URL!
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