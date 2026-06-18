import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, hashPassword } from '@/lib/auth'

// GET all users (admin only)
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      branchId: true,
      branch: {
        select: { id: true, name: true },
      },
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ users })
}

// POST create a new user (admin only)
export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { name, email, password, role, branchId } = await request.json()

  if (!name || !email || !password || !role) {
    return NextResponse.json(
      { error: 'Name, email, password, and role are required' },
      { status: 400 }
    )
  }

  if (!['ADMIN', 'INPUTTER', 'VIEWER'].includes(role)) {
    return NextResponse.json(
      { error: 'Invalid role. Must be ADMIN, INPUTTER, or VIEWER' },
      { status: 400 }
    )
  }

  // INPUTTER and VIEWER must be assigned to a branch
  if ((role === 'INPUTTER' || role === 'VIEWER') && !branchId) {
    return NextResponse.json(
      { error: 'INPUTTER and VIEWER users must be assigned to a branch' },
      { status: 400 }
    )
  }

  // Verify branch exists if provided
  if (branchId) {
    const branch = await prisma.branch.findUnique({ where: { id: branchId } })
    if (!branch) {
      return NextResponse.json(
        { error: 'Branch not found' },
        { status: 404 }
      )
    }
  }

  try {
    const hashedPassword = await hashPassword(password)
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role,
        branchId: branchId || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
        branch: {
          select: { id: true, name: true },
        },
        createdAt: true,
      },
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      )
    }
    console.error('[ADMIN] Create user error:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}