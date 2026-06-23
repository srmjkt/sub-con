import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { getBranchFilter } from '@/lib/branchAccess'

// GET incident reports (filtered by branch access)
export async function GET(request: Request) {
  let session
  try {
    session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get('branchId')

    // Build where clause based on role and branch access
    const where = session.role === 'ADMIN'
      ? (branchId ? { branchId } : undefined)
      : (getBranchFilter(session, branchId) as Parameters<typeof prisma.incidentReport.findMany>[0]['where'] | undefined)

    const query: Parameters<typeof prisma.incidentReport.findMany>[0] = {
      select: {
        id: true,
        title: true,
        description: true,
        severity: true,
        date: true,
        location: true,
        status: true,
        branchId: true,
        reportedById: true,
        customFieldsData: true,
        createdAt: true,
        updatedAt: true,
        branch: { select: { id: true, name: true } },
        reportedBy: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    }
    if (where) query.where = where

    const incidents = await prisma.incidentReport.findMany(query)

    return NextResponse.json({ incidents })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : ''
    console.error('Failed to fetch incidents:', errorMessage)
    console.error('Stack:', errorStack)
    console.error('Session:', session ? { userId: session.userId, role: session.role, branchId: session.branchId } : 'null')
    return NextResponse.json(
      { error: 'Failed to fetch incidents', details: errorMessage },
      { status: 500 }
    )
  }
}

// POST create incident report (INPUTTER and ADMIN only)
export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.role === 'VIEWER') {
    return NextResponse.json(
      { error: 'Viewers cannot create records' },
      { status: 403 }
    )
  }

  const body: any = await request.json()
  const { title, description, severity, date, location, status, branchId, customFieldsData } = body

  if (!title || !description || !date) {
    return NextResponse.json(
      { error: 'Title, description, and date are required' },
      { status: 400 }
    )
  }

  // Determine the target branch
  const targetBranchId =
    session.role === 'ADMIN' ? branchId : session.branchId
  if (!targetBranchId) {
    return NextResponse.json(
      { error: 'Branch assignment is required' },
      { status: 400 }
    )
  }

  const incident = await prisma.incidentReport.create({
    data: {
      title: title.trim(),
      description: description.trim(),
      severity: severity || 'low',
      date: new Date(date),
      location: location || null,
      status: status || 'open',
      branchId: targetBranchId,
      reportedById: session.userId,
      customFieldsData: customFieldsData || undefined,
    },
    include: {
      branch: { select: { id: true, name: true } },
      reportedBy: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({ incident }, { status: 201 })
}