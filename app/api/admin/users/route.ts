import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, hashPassword } from '@/lib/auth'

const VALID_USERNAME_REGEX = /^[a-zA-Z0-9._]+$/

function validateUsername(username: string): string | null {
  if (!username || !username.trim()) {
    return 'Username is required'
  }
  if (username.length < 3) {
    return 'Username must be at least 3 characters'
  }
  if (!VALID_USERNAME_REGEX.test(username)) {
    return 'Username can only contain letters, numbers, dots (.), and underscores (_)'
  }
  return null
}

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
      username: true,
      email: true,
      role: true,
      branchId: true,
      branchAccess: true,
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

  const { name, username, email, password, role, branchId, branchAccess } = await request.json()

  if (!name || !username || !email || !password || !role) {
    return NextResponse.json(
      { error: 'Name, username, email, password, and role are required' },
      { status: 400 }
    )
  }

  // Validate username
  const usernameError = validateUsername(username)
  if (usernameError) {
    return NextResponse.json({ error: usernameError }, { status: 400 })
  }

  if (!['ADMIN', 'INPUTTER', 'VIEWER'].includes(role)) {
    return NextResponse.json(
      { error: 'Invalid role. Must be ADMIN, INPUTTER, or VIEWER' },
      { status: 400 }
    )
  }

  // INPUTTER and VIEWER must be assigned to a branch or have branch access
  if ((role === 'INPUTTER' || role === 'VIEWER') && !branchAccess) {
    return NextResponse.json(
      { error: 'INPUTTER and VIEWER users must have branch access configured' },
      { status: 400 }
    )
  }

  // Validate branch access
  if (branchAccess && branchAccess.type === 'custom') {
    if (!branchAccess.branchIds || branchAccess.branchIds.length === 0) {
      return NextResponse.json(
        { error: 'Custom branch access requires at least one branch' },
        { status: 400 }
      )
    }
    const branches = await prisma.branch.findMany({
      where: { id: { in: branchAccess.branchIds } },
      select: { id: true },
    })
    if (branches.length !== branchAccess.branchIds.length) {
      return NextResponse.json(
        { error: 'One or more branches not found' },
        { status: 404 }
      )
    }
  }

  // Verify branch exists if provided (for single branch access)
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
        username: username.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role,
        branchId: role === 'ADMIN' ? null : branchId || null,
        branchAccess: role === 'ADMIN' ? null : branchAccess || null,
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        branchId: true,
        branchAccess: true,
        branch: {
          select: { id: true, name: true },
        },
        createdAt: true,
      },
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'P2002') {
        const target = (error as { meta?: { target?: string[] } }).meta?.target
        if (target?.includes('username')) {
          return NextResponse.json(
            { error: 'A user with this username already exists' },
            { status: 409 }
          )
        }
        return NextResponse.json(
          { error: 'A user with this email already exists' },
          { status: 409 }
        )
      }
    }
    console.error('[ADMIN] Create user error:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}