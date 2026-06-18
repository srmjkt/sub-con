import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'sub-con-secret-key-change-in-production'
)

const COOKIE_NAME = 'session-token'

// Routes that require authentication
const protectedRoutes = ['/admin', '/inputter', '/viewer', '/dashboard']

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

  // Only protect specific routes - do NOT intercept /login
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  )

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
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (pathname.startsWith('/inputter') && role !== 'INPUTTER' && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (pathname.startsWith('/viewer') && role !== 'VIEWER' && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/inputter/:path*', '/viewer/:path*', '/dashboard/:path*'],
}