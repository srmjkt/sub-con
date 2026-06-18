import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET inventory (filtered by branch access)
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
      return NextResponse.json({ inventory: [] })
    }
    where.branchId = session.branchId
  }

  const inventory = await prisma.inventory.findMany({
    where,
    include: {
      branch: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { itemName: 'asc' },
  })

  return NextResponse.json({ inventory })
}

// POST create inventory item (INPUTTER and ADMIN only)
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

  const { itemName, quantity, unit, category, status, branchId } =
    await request.json()

  if (!itemName) {
    return NextResponse.json(
      { error: 'Item name is required' },
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

  const inventory = await prisma.inventory.create({
    data: {
      itemName: itemName.trim(),
      quantity: quantity || 0,
      unit: unit || 'pcs',
      category: category || null,
      status: status || 'available',
      branchId: targetBranchId,
      createdById: session.userId,
    },
    include: {
      branch: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({ inventory }, { status: 201 })
}