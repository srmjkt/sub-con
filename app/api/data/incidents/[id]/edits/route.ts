import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const edits = await prisma.incidentReportEdit.findMany({
      where: { incidentReportId: id },
      include: {
        editedBy: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: { editedAt: 'desc' },
    })

    return NextResponse.json({ edits })
  } catch (error) {
    console.error('[INCIDENT_EDITS] Error fetching edits:', error)
    return NextResponse.json(
      { error: 'Failed to fetch edit history' },
      { status: 500 }
    )
  }
}