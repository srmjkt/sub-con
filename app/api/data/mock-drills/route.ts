import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET mock drills (filtered by branch access)
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
      return NextResponse.json({ mockDrills: [] })
    }
    where.branchId = session.branchId
  }

  const mockDrills = await prisma.mockDrill.findMany({
    where,
    include: {
      branch: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { date: 'desc' },
  })

  return NextResponse.json({ mockDrills })
}

// POST create mock drill (INPUTTER and ADMIN only)
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

  const { title, description, date, participants, drillType, result, notes, branchId } =
    await request.json()

  if (!title || !date) {
    return NextResponse.json(
      { error: 'Title and date are required' },
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

  const mockDrill = await prisma.mockDrill.create({
    data: {
      title: title.trim(),
      description: description || null,
      date: new Date(date),
      participants: participants || 0,
      drillType: drillType || null,
      result: result || null,
      notes: notes || null,
      branchId: targetBranchId,
      createdById: session.userId,
    },
    include: {
      branch: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({ mockDrill }, { status: 201 })
}