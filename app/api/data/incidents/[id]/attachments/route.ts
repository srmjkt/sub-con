import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

// GET: List all attachments for an incident
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const incident = await prisma.incidentReport.findUnique({
    where: { id },
    select: { id: true, branchId: true },
  })

  if (!incident) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (session.role !== 'ADMIN' && incident.branchId !== session.branchId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const attachments = await prisma.incidentAttachment.findMany({
    where: { incidentReportId: id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      fileName: true,
      filePath: true,
      fileType: true,
      fileSize: true,
      uploadedById: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ attachments })
}

// POST: Upload a file to an incident
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.role === 'VIEWER') {
    return NextResponse.json(
      { error: 'Viewers cannot upload files' },
      { status: 403 }
    )
  }

  const { id } = await params

  const incident = await prisma.incidentReport.findUnique({
    where: { id },
    select: { id: true, branchId: true },
  })

  if (!incident) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (session.role !== 'ADMIN' && incident.branchId !== session.branchId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Parse form data
  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json(
      { error: 'No file provided' },
      { status: 400 }
    )
  }

  // Validate file type
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'video/mp4',
    'video/webm',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ]

  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: 'File type not allowed' },
      { status: 400 }
    )
  }

  // 10MB size limit
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: 'File too large (max 10MB)' },
      { status: 400 }
    )
  }

  // Generate unique filename
  const ext = path.extname(file.name) || '.bin'
  const uniqueName = `${uuidv4()}${ext}`
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'incidents')
  const filePath = `/uploads/incidents/${uniqueName}`

  try {
    await mkdir(uploadDir, { recursive: true })
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(path.join(uploadDir, uniqueName), buffer)
  } catch (writeError) {
    console.error('Failed to save file:', writeError)
    return NextResponse.json(
      { error: 'Failed to save file' },
      { status: 500 }
    )
  }

  // Save to database
  const attachment = await prisma.incidentAttachment.create({
    data: {
      incidentReportId: id,
      fileName: file.name,
      filePath: filePath,
      fileType: file.type,
      fileSize: file.size,
      uploadedById: session.userId,
    },
    select: {
      id: true,
      fileName: true,
      filePath: true,
      fileType: true,
      fileSize: true,
      uploadedById: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ attachment })
}

// DELETE: Remove an attachment
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: incidentId } = await params
  const url = new URL(request.url)
  const attachmentId = url.searchParams.get('attachmentId')

  if (!attachmentId) {
    return NextResponse.json(
      { error: 'attachmentId query parameter required' },
      { status: 400 }
    )
  }

  const attachment = await prisma.incidentAttachment.findUnique({
    where: { id: attachmentId },
    include: {
      incidentReport: { select: { branchId: true } },
    },
  })

  if (!attachment) {
    return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
  }

  if (
    session.role !== 'ADMIN' &&
    attachment.incidentReport.branchId !== session.branchId
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Delete file from disk (non-blocking)
  const fullPath = path.join(process.cwd(), 'public', attachment.filePath)
  try {
    const { unlink } = await import('fs/promises')
    await unlink(fullPath)
  } catch {
    // File may not exist on disk, still remove DB record
  }

  await prisma.incidentAttachment.delete({
    where: { id: attachmentId },
  })

  return NextResponse.json({ success: true })
}