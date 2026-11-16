import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { toggleSource, deleteSource } from '@/lib/osint'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET /api/osint/:id — get single source summary
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  return NextResponse.json({ id, message: 'Use /api/osint?type=findings to list findings' })
}

// PATCH /api/osint/:id — toggle source enabled/disabled
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden: ADMIN only' }, { status: 403 })
  }

  const { id } = await params
  try {
    const body = await request.json()
    const { isEnabled } = body
    if (typeof isEnabled !== 'boolean') {
      return NextResponse.json({ error: 'isEnabled (boolean) is required' }, { status: 400 })
    }
    const source = await toggleSource(id, isEnabled)
    return NextResponse.json({ source })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE /api/osint/:id — delete a source
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden: ADMIN only' }, { status: 403 })
  }

  const { id } = await params
  try {
    await deleteSource(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}