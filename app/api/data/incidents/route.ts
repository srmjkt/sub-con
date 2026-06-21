import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { getBranchFilter } from '@/lib/branchAccess'

// GET incident reports (filtered by branch access)
export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const branchId = searchParams.get('branchId')

  // Build where clause based on role and branch access
  const where: Record<string, unknown> = getBranchFilter(session, branchId)

  const incidents = await prisma.incidentReport.findMany({
    where,
    include: {
      branch: { select: { id: true, name: true } },
      reportedBy: { select: { id: true, name: true } },
      customFieldsData: true,
    },
    orderBy: { date: 'desc' },
  })

  return NextResponse.json({ incidents })
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

  const { title, description, severity, date, location, status, branchId, customFieldsData } =
    await request.json()

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