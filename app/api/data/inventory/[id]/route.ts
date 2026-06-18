import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET single inventory item
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const item = await prisma.inventory.findUnique({
    where: { id },
    include: {
      branch: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  })

  if (!item) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (session.role !== 'ADMIN' && item.branchId !== session.branchId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ item })
}

// PUT update inventory item (ADMIN and INPUTTER)
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

  const existing = await prisma.inventory.findUnique({
    where: { id },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (session.role !== 'ADMIN' && existing.branchId !== session.branchId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { itemName, quantity, unit, category, status, branchId } =
    await request.json()

  const item = await prisma.inventory.update({
    where: { id },
    data: {
      ...(itemName !== undefined && { itemName: itemName.trim() }),
      ...(quantity !== undefined && { quantity }),
      ...(unit !== undefined && { unit: unit || 'pcs' }),
      ...(category !== undefined && { category: category || null }),
      ...(status !== undefined && { status }),
      ...(branchId !== undefined && session.role === 'ADMIN' && { branchId }),
    },
    include: {
      branch: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({ item })
}

// DELETE inventory item (ADMIN only)
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

  const existing = await prisma.inventory.findUnique({
    where: { id },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.inventory.delete({
    where: { id },
  })

  return NextResponse.json({ success: true })
}