import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET all branches (admin only)
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const branches = await prisma.branch.findMany({
    include: {
      _count: {
        select: {
          users: true,
          incidentReports: true,
          attendanceRecords: true,
          trainings: true,
          simulations: true,
          mockDrills: true,
          inventories: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ branches })
}

// POST create a new branch (admin only)
export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { name } = await request.json()
  if (!name || !name.trim()) {
    return NextResponse.json(
      { error: 'Branch name is required' },
      { status: 400 }
    )
  }

  try {
    const branch = await prisma.branch.create({
      data: { name: name.trim() },
    })
    return NextResponse.json({ branch }, { status: 201 })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A branch with this name already exists' },
        { status: 409 }
      )
    }
    console.error('[ADMIN] Create branch error:', error)
    return NextResponse.json(
      { error: 'Failed to create branch' },
      { status: 500 }
    )
  }
}