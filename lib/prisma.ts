import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPool() {
  // Use DIRECT_URL for serverless (Vercel) to avoid PgBouncer prepared statement issues
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL!
  const url = new URL(connectionString)
  return new pg.Pool({
    host: url.hostname,
    port: Number(url.port),
    database: url.pathname.slice(1),
    user: url.username,
    password: decodeURIComponent(url.password),
  })
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(createPool()),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma