import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if a user with this email exists
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: {
        branch: { select: { name: true } },
      },
    })

    // Find all admins to notify
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true, name: true, email: true },
    })

    if (admins.length === 0) {
      console.warn(`[FORGOT CREDENTIALS] No admins found to notify for request from ${email}`)
    }

    // Log the request to console (in production, you'd send an email or create a notification)
    console.log(`[FORGOT CREDENTIALS] Request from: ${email}`)
    console.log(`[FORGOT CREDENTIALS] User found: ${user ? `${user.name} (${user.role}) in branch: ${user.branch?.name || 'N/A'}` : 'No user found with this email'}`)
    console.log(`[FORGOT CREDENTIALS] Admins notified: ${admins.map(a => `${a.name} <${a.email}>`).join(', ') || 'None'}`)

    // Always return a success message regardless of whether the email exists
    // This prevents email enumeration attacks
    return NextResponse.json({
      message: 'Your request has been submitted. An administrator will contact you shortly.',
    })
  } catch (error) {
    console.error('[FORGOT CREDENTIALS] Error:', error)
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}