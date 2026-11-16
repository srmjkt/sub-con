import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import {
  getStats,
  getSources,
  getFindings,
  createSource,
} from '@/lib/osint'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET /api/osint?type=stats|sources|findings
export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'findings'

  try {
    if (type === 'stats') {
      const stats = await getStats()
      return NextResponse.json({ stats })
    }

    if (type === 'sources') {
      const sources = await getSources()
      return NextResponse.json({ sources })
    }

    // findings (default)
    const page = Number(searchParams.get('page') || '1')
    const limit = Number(searchParams.get('limit') || '20')
    const severity = searchParams.get('severity') || undefined
    const category = searchParams.get('category') || undefined
    const sourceType = searchParams.get('sourceType') || undefined
    const search = searchParams.get('search') || undefined

    const result = await getFindings({ page, limit, severity, category, sourceType, search })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST /api/osint — create a new OSINT source (ADMIN only)
export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden: ADMIN only' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { name, type, target, isEnabled, apiKey } = body

    if (!name || !type || !target) {
      return NextResponse.json({ error: 'name, type, and target are required' }, { status: 400 })
    }

    const source = await createSource({ name, type, target, isEnabled, apiKey })
    return NextResponse.json({ source }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}