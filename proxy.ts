import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'sub-con-secret-key-change-in-production'
)

const COOKIE_NAME = 'session-token'

// Routes that require authentication
const protectedRoutes = ['/admin', '/inputter', '/viewer', '/dashboard']

// Routes that should redirect to dashboard if already logged in
const authRoutes = ['/login']

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as { userId: string; role: string; branchId: string | null }
  } catch {
    return null
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(COOKIE_NAME)?.value

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  )
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route))

  if (isProtectedRoute) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const session = await verifyToken(token)
    if (!session) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete(COOKIE_NAME)
      return response
    }

    // Role-based route protection
    const role = session.role

    if (pathname.startsWith('/admin') && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    if (pathname.startsWith('/inputter') && role !== 'INPUTTER' && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    if (pathname.startsWith('/viewer') && role !== 'VIEWER' && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // If logged in and trying to access login page, redirect to appropriate dashboard
  if (isAuthRoute && token) {
    const session = await verifyToken(token)
    if (session) {
      if (session.role === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
      if (session.role === 'INPUTTER') {
        return NextResponse.redirect(new URL('/inputter', request.url))
      }
      if (session.role === 'VIEWER') {
        return NextResponse.redirect(new URL('/viewer', request.url))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/inputter/:path*', '/viewer/:path*', '/dashboard/:path*', '/login'],
}