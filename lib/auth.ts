import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'sub-con-secret-key-change-in-production'
)

const COOKIE_NAME = 'session-token'

export interface SessionPayload {
  userId: string
  email: string
  role: 'ADMIN' | 'INPUTTER' | 'VIEWER'
  branchId: string | null
  branchAccess?: {
    type: 'all' | 'custom' | 'single'
    branchIds?: string[]
  } | null
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET)
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  })
}

export async function removeSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifySessionToken(token)
}

export async function getAuthenticatedUser() {
  const session = await getSession()
  if (!session) return null

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
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
    },
  })

  return user
}

export function requireAuth(allowedRoles?: ('ADMIN' | 'INPUTTER' | 'VIEWER')[]) {
  return async function authGuard() {
    const session = await getSession()
    if (!session) {
      throw new Error('UNAUTHORIZED')
    }
    if (allowedRoles && !allowedRoles.includes(session.role)) {
      throw new Error('FORBIDDEN')
    }
    return session
  }
}