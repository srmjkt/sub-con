import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET single attendance record
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const record = await prisma.attendanceRecord.findUnique({
    where: { id },
    include: {
      branch: { select: { id: true, name: true } },
      recordedBy: { select: { id: true, name: true } },
    },
  })

  if (!record) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (session.role !== 'ADMIN' && record.branchId !== session.branchId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ record })
}

// PUT update attendance record (ADMIN and INPUTTER)
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

  const existing = await prisma.attendanceRecord.findUnique({
    where: { id },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (session.role !== 'ADMIN' && existing.branchId !== session.branchId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { employeeName, date, status, notes, branchId } = await request.json()

  const record = await prisma.attendanceRecord.update({
    where: { id },
    data: {
      ...(employeeName !== undefined && { employeeName: employeeName.trim() }),
      ...(date !== undefined && { date: new Date(date) }),
      ...(status !== undefined && { status }),
      ...(notes !== undefined && { notes: notes || null }),
      ...(branchId !== undefined && session.role === 'ADMIN' && { branchId }),
    },
    include: {
      branch: { select: { id: true, name: true } },
      recordedBy: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({ record })
}

// DELETE attendance record (ADMIN only)
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

  const existing = await prisma.attendanceRecord.findUnique({
    where: { id },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.attendanceRecord.delete({
    where: { id },
  })

  return NextResponse.json({ success: true })
}