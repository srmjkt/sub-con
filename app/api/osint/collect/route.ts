import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { runCollection, runAllCollections } from '@/lib/osint'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// POST /api/osint/collect?sourceId=...  or  POST /api/osint/collect/all
export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden: ADMIN only' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const sourceId = searchParams.get('sourceId')
  const collectAll = searchParams.get('all') === '1'

  try {
    if (collectAll) {
      const results = await runAllCollections()
      return NextResponse.json({ results })
    }

    if (!sourceId) {
      return NextResponse.json({ error: 'sourceId is required' }, { status: 400 })
    }

    const result = await runCollection(sourceId)
    return NextResponse.json({ result })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}