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

// DELETE a user (admin only)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  // Prevent admin from deleting themselves
  if (id === session.userId) {
    return NextResponse.json(
      { error: 'Cannot delete your own account' },
      { status: 400 }
    )
  }

  // Check if the user to delete is the original admin (admin@subcon.com)
  const userToDelete = await prisma.user.findUnique({
    where: { id },
    select: { email: true },
  })

  if (!userToDelete) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Protect the original admin from being deleted by other admins
  if (userToDelete.email === 'admin@subcon.com' && session.email !== 'admin@subcon.com') {
    return NextResponse.json(
      { error: 'Cannot delete the original administrator (admin@subcon.com)' },
      { status: 403 }
    )
  }

  try {
    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    console.error('[ADMIN] Delete user error:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}

// POST bulk delete users (admin only)
export async function POST(
  _request: Request,
  _params: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // This endpoint is for bulk delete, but we're using it differently
  // The actual bulk delete will be handled by a separate endpoint
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

// PATCH update a user (admin only)
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const { name, username, email, password, role, branchId } = await _request.json()

  const updateData: Record<string, unknown> = {}

  if (name) updateData.name = name.trim()
  if (username !== undefined) {
    const usernameError = validateUsername(username)
    if (usernameError) {
      return NextResponse.json({ error: usernameError }, { status: 400 })
    }
    updateData.username = username.trim()
  }
  if (email) updateData.email = email.toLowerCase().trim()
  if (role && ['ADMIN', 'INPUTTER', 'VIEWER'].includes(role)) {
    updateData.role = role
  }
  if (branchId !== undefined) {
    updateData.branchId = branchId || null
  }
  if (password) {
    updateData.password = await hashPassword(password)
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        branchId: true,
        branch: {
          select: { id: true, name: true },
        },
        createdAt: true,
      },
    })
    return NextResponse.json({ user })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
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
    console.error('[ADMIN] Update user error:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}