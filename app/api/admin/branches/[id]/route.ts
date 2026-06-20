import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET a single branch (admin only)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  try {
    const branch = await prisma.branch.findUnique({
      where: { id },
    })
    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
    }
    return NextResponse.json({ branch })
  } catch (error) {
    console.error('[ADMIN] Get branch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch branch' },
      { status: 500 }
    )
  }
}

// DELETE a branch (admin only)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  try {
    await prisma.branch.delete({ where: { id } })
    return NextResponse.json({ message: 'Branch deleted successfully' })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
    }
    console.error('[ADMIN] Delete branch error:', error)
    return NextResponse.json(
      { error: 'Failed to delete branch' },
      { status: 500 }
    )
  }
}

// PATCH update a branch (admin only)
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const { name } = await _request.json()

  if (!name || !name.trim()) {
    return NextResponse.json(
      { error: 'Branch name is required' },
      { status: 400 }
    )
  }

  try {
    const branch = await prisma.branch.update({
      where: { id },
      data: { name: name.trim() },
    })
    return NextResponse.json({ branch })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
    }
    console.error('[ADMIN] Update branch error:', error)
    return NextResponse.json(
      { error: 'Failed to update branch' },
      { status: 500 }
    )
  }
}