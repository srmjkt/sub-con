import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// POST bulk delete users (admin only)
export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userIds } = await request.json()

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json(
      { error: 'Please select at least one user to delete' },
      { status: 400 }
    )
  }

  // Filter out the current user (cannot delete yourself)
  const idsToDelete = userIds.filter((id: string) => id !== session.userId)

  if (idsToDelete.length === 0) {
    return NextResponse.json(
      { error: 'Cannot delete your own account' },
      { status: 400 }
    )
  }

  // Check if any of the users to delete is the original admin
  const usersToDelete = await prisma.user.findMany({
    where: { id: { in: idsToDelete } },
    select: { id: true, email: true },
  })

  const originalAdmin = usersToDelete.find((u) => u.email === 'admin@subcon.com')
  if (originalAdmin && session.email !== 'admin@subcon.com') {
    return NextResponse.json(
      { error: 'Cannot delete the original administrator (admin@subcon.com)' },
      { status: 403 }
    )
  }

  try {
    await prisma.user.deleteMany({
      where: { id: { in: idsToDelete } },
    })
    return NextResponse.json({ 
      message: `Successfully deleted ${idsToDelete.length} user(s)` 
    })
  } catch (error: unknown) {
    console.error('[ADMIN] Bulk delete users error:', error)
    return NextResponse.json(
      { error: 'Failed to delete users' },
      { status: 500 }
    )
  }
}