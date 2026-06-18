import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET trainings (filtered by branch access)
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
      return NextResponse.json({ trainings: [] })
    }
    where.branchId = session.branchId
  }

  const trainings = await prisma.training.findMany({
    where,
    include: {
      branch: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { date: 'desc' },
  })

  return NextResponse.json({ trainings })
}

// POST create training (INPUTTER and ADMIN only)
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

  const { title, description, date, duration, participants, trainer, status, branchId } =
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

  const training = await prisma.training.create({
    data: {
      title: title.trim(),
      description: description || null,
      date: new Date(date),
      duration: duration || null,
      participants: participants || 0,
      trainer: trainer || null,
      status: status || 'scheduled',
      branchId: targetBranchId,
      createdById: session.userId,
    },
    include: {
      branch: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({ training }, { status: 201 })
}