import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET attendance records (filtered by branch access)
export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const branchId = searchParams.get('branchId')

  const where: Record<string, unknown> = {}
  if (session.role === 'ADMIN') {
    if (branchId) where.branchId = branchId
  } else {
    if (!session.branchId) {
      return NextResponse.json({ records: [] })
    }
    where.branchId = session.branchId
  }

  const records = await prisma.attendanceRecord.findMany({
    where,
    include: {
      branch: { select: { id: true, name: true } },
      recordedBy: { select: { id: true, name: true } },
    },
    orderBy: { date: 'desc' },
  })

  return NextResponse.json({ records })
}

// POST create attendance record (INPUTTER and ADMIN only)
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

  const { employeeName, date, status, notes, branchId } = await request.json()

  if (!employeeName || !date) {
    return NextResponse.json(
      { error: 'Employee name and date are required' },
      { status: 400 }
    )
  }

  const targetBranchId =
    session.role === 'ADMIN' ? branchId : session.branchId
  if (!targetBranchId) {
    return NextResponse.json(
      { error: 'Branch assignment is required' },
      { status: 400 }
    )
  }

  const record = await prisma.attendanceRecord.create({
    data: {
      employeeName: employeeName.trim(),
      date: new Date(date),
      status: status || 'present',
      notes: notes || null,
      branchId: targetBranchId,
      recordedById: session.userId,
    },
    include: {
      branch: { select: { id: true, name: true } },
      recordedBy: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({ record }, { status: 201 })
}