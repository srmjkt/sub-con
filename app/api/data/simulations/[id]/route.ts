import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET single simulation
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const simulation = await prisma.simulation.findUnique({
    where: { id },
    include: {
      branch: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  })

  if (!simulation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (session.role !== 'ADMIN' && simulation.branchId !== session.branchId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ simulation })
}

// PUT update simulation (ADMIN and INPUTTER)
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

  const existing = await prisma.simulation.findUnique({
    where: { id },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (session.role !== 'ADMIN' && existing.branchId !== session.branchId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { title, description, date, participants, scenario, result, notes, branchId } =
    await request.json()

  const simulation = await prisma.simulation.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description: description || null }),
      ...(date !== undefined && { date: new Date(date) }),
      ...(participants !== undefined && { participants }),
      ...(scenario !== undefined && { scenario: scenario || null }),
      ...(result !== undefined && { result: result || null }),
      ...(notes !== undefined && { notes: notes || null }),
      ...(branchId !== undefined && session.role === 'ADMIN' && { branchId }),
    },
    include: {
      branch: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({ simulation })
}

// DELETE simulation (ADMIN only)
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

  const existing = await prisma.simulation.findUnique({
    where: { id },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.simulation.delete({
    where: { id },
  })

  return NextResponse.json({ success: true })
}