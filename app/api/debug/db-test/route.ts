import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    env: {
      DB_URL: process.env.DB_URL ? 'set' : 'not set',
      DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'not set',
      DIRECT_URL: process.env.DIRECT_URL ? 'set' : 'not set',
    },
    tests: [] as any[],
  }

  // Test 1: Show all env var values (masked)
  const envVars = ['DB_URL', 'DATABASE_URL', 'DIRECT_URL'] as const
  for (const varName of envVars) {
    const val = process.env[varName]
    if (val) {
      try {
        const url = new URL(val)
        results.tests.push({
          test: `env_${varName}`,
          success: true,
          host: url.hostname,
          port: url.port,
          database: url.pathname.slice(1),
        })
      } catch (e) {
        results.tests.push({
          test: `env_${varName}`,
          success: false,
          error: 'Failed to parse',
        })
      }
    } else {
      results.tests.push({
        test: `env_${varName}`,
        success: false,
        error: 'not set',
      })
    }
  }

  // Test 2: Check which env var is being used
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL || process.env.DB_URL
  if (connectionString) {
    try {
      const url = new URL(connectionString)
      results.tests.push({
        test: 'connection_string_parse',
        success: true,
        host: url.hostname,
        port: url.port,
        database: url.pathname.slice(1),
      })
    } catch (e) {
      results.tests.push({
        test: 'connection_string_parse',
        success: false,
        error: 'Failed to parse connection string',
      })
    }
  } else {
    results.tests.push({
      test: 'connection_string_parse',
      success: false,
      error: 'No connection string found in env vars',
    })
  }

  // Test 2: Try to connect to database
  try {
    const start = Date.now()
    const user = await prisma.user.findFirst({
      where: { email: 'admin@subcon.com' },
      select: { id: true, email: true },
    })
    const duration = Date.now() - start
    results.tests.push({
      test: 'database_query',
      success: true,
      duration: `${duration}ms`,
      user: user ? { id: user.id, email: user.email } : null,
    })
  } catch (error: any) {
    results.tests.push({
      test: 'database_query',
      success: false,
      error: error.message,
      code: error.code,
      meta: error.meta,
    })
  }

  return NextResponse.json(results)
}