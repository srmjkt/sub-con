import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPool() {
  // Use DATABASE_URL (Supabase connection pooler on port 6543) for serverless (Vercel)
  // The pooler is more permissive with firewall rules than the direct connection (port 5432)
  const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL!
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