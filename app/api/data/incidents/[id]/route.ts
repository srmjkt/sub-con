import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET single incident
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const incident = await prisma.incidentReport.findUnique({
    where: { id },
    include: {
      branch: { select: { id: true, name: true } },
      reportedBy: { select: { id: true, name: true } },
      customFieldsData: true,
    },
  })

  if (!incident) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (session.role !== 'ADMIN' && incident.branchId !== session.branchId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ incident })
}

// PUT update incident (ADMIN and INPUTTER)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.role === 'VIEWER') {
    return NextResponse.json(
      { error: 'Viewers cannot update records' },
      { status: 403 }
    )
  }

  const { id } = await params

  const existing = await prisma.incidentReport.findUnique({
    where: { id },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (session.role !== 'ADMIN' && existing.branchId !== session.branchId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { title, description, severity, date, location, status, branchId } =
    await request.json()

  // Track changes for edit history
  const changes: { fieldName: string; oldValue: string | null; newValue: string | null }[] = []

  if (title !== undefined && title.trim() !== existing.title) {
    changes.push({ fieldName: 'title', oldValue: existing.title, newValue: title.trim() })
  }
  if (description !== undefined && description.trim() !== existing.description) {
    changes.push({ fieldName: 'description', oldValue: existing.description, newValue: description.trim() })
  }
  if (severity !== undefined && severity !== existing.severity) {
    changes.push({ fieldName: 'severity', oldValue: existing.severity, newValue: severity })
  }
  if (date !== undefined && new Date(date).toISOString() !== new Date(existing.date).toISOString()) {
    changes.push({ fieldName: 'date', oldValue: existing.date.toISOString(), newValue: new Date(date).toISOString() })
  }
  if (location !== undefined && (location || null) !== existing.location) {
    changes.push({ fieldName: 'location', oldValue: existing.location, newValue: location || null })
  }
  if (status !== undefined && status !== existing.status) {
    changes.push({ fieldName: 'status', oldValue: existing.status, newValue: status })
  }

  const incident = await prisma.incidentReport.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description: description.trim() }),
      ...(severity !== undefined && { severity }),
      ...(date !== undefined && { date: new Date(date) }),
      ...(location !== undefined && { location: location || null }),
      ...(status !== undefined && { status }),
      ...(branchId !== undefined && session.role === 'ADMIN' && { branchId }),
    },
    include: {
      branch: { select: { id: true, name: true } },
      reportedBy: { select: { id: true, name: true } },
    },
  })

  // Save edit history
  if (changes.length > 0) {
    await prisma.incidentReportEdit.createMany({
      data: changes.map((change) => ({
        incidentReportId: id,
        editedById: session.userId,
        fieldName: change.fieldName,
        oldValue: change.oldValue,
        newValue: change.newValue,
      })),
    })
  }

  return NextResponse.json({ incident })
}

// DELETE incident (ADMIN only)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Only admins can delete records' },
      { status: 403 }
    )
  }

  const { id } = await params

  const existing = await prisma.incidentReport.findUnique({
    where: { id },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.incidentReport.delete({
    where: { id },
  })

  return NextResponse.json({ success: true })
}