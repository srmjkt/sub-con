import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  SessionPayload,
  verifyPassword,
  createSessionToken,
  setSessionCookie,
} from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email/Username and password are required' },
        { status: 400 }
      )
    }

    const searchTerm = email.trim()
    // Find user by email OR username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: searchTerm.toLowerCase() },
          ...(searchTerm.includes('@') ? [] : [{ username: searchTerm }]),
        ],
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        password: true,
        role: true,
        branchId: true,
        branchAccess: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email/username or password' },
        { status: 401 }
      )
    }

    const isValid = await verifyPassword(password, user.password)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email/username or password' },
        { status: 401 }
      )
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
      branchAccess: user.branchAccess as SessionPayload['branchAccess'],
    })

    await setSessionCookie(token)

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
        branchAccess: user.branchAccess,
      },
    })
  } catch (error) {
    console.error('[AUTH] Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}