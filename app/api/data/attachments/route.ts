import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

// GET: List all attachments for a record
export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const module = searchParams.get('module')
  const recordId = searchParams.get('recordId')

  if (!module || !recordId) {
    return NextResponse.json({ error: 'Module and recordId are required' }, { status: 400 })
  }

  // Get the record to check branch access
  let record: { branchId: string } | null = null
  
  switch (module) {
    case 'incidents':
      record = await prisma.incidentReport.findUnique({
        where: { id: recordId },
        select: { branchId: true },
      })
      break
    case 'attendance':
      record = await prisma.attendanceRecord.findUnique({
        where: { id: recordId },
        select: { branchId: true },
      })
      break
    case 'trainings':
      record = await prisma.training.findUnique({
        where: { id: recordId },
        select: { branchId: true },
      })
      break
    case 'simulations':
      record = await prisma.simulation.findUnique({
        where: { id: recordId },
        select: { branchId: true },
      })
      break
    case 'mock_drills':
      record = await prisma.mockDrill.findUnique({
        where: { id: recordId },
        select: { branchId: true },
      })
      break
    case 'inventory':
      record = await prisma.inventory.findUnique({
        where: { id: recordId },
        select: { branchId: true },
      })
      break
  }

  if (!record) {
    return NextResponse.json({ error: 'Record not found' }, { status: 404 })
  }

  if (session.role !== 'ADMIN' && record.branchId !== session.branchId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const attachments = await prisma.attachment.findMany({
    where: { module, recordId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      fileName: true,
      filePath: true,
      fileType: true,
      fileSize: true,
      uploadedById: true,
      uploadedBy: {
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
        },
      },
      createdAt: true,
    },
  })

  return NextResponse.json({ attachments })
}

// POST: Upload a file to a record
export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.role === 'VIEWER') {
    return NextResponse.json({ error: 'Viewers cannot upload files' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const module = searchParams.get('module')
  const recordId = searchParams.get('recordId')

  if (!module || !recordId) {
    return NextResponse.json({ error: 'Module and recordId are required' }, { status: 400 })
  }

  // Get the record to check branch access
  let record: { branchId: string } | null = null
  
  switch (module) {
    case 'incidents':
      record = await prisma.incidentReport.findUnique({
        where: { id: recordId },
        select: { branchId: true },
      })
      break
    case 'attendance':
      record = await prisma.attendanceRecord.findUnique({
        where: { id: recordId },
        select: { branchId: true },
      })
      break
    case 'trainings':
      record = await prisma.training.findUnique({
        where: { id: recordId },
        select: { branchId: true },
      })
      break
    case 'simulations':
      record = await prisma.simulation.findUnique({
        where: { id: recordId },
        select: { branchId: true },
      })
      break
    case 'mock_drills':
      record = await prisma.mockDrill.findUnique({
        where: { id: recordId },
        select: { branchId: true },
      })
      break
    case 'inventory':
      record = await prisma.inventory.findUnique({
        where: { id: recordId },
        select: { branchId: true },
      })
      break
  }

  if (!record) {
    return NextResponse.json({ error: 'Record not found' }, { status: 404 })
  }

  if (session.role !== 'ADMIN' && record.branchId !== session.branchId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Parse form data
  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
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
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
  }

  // 10MB size limit
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
  }

  // Generate unique filename
  const ext = path.extname(file.name) || '.bin'
  const uniqueName = `${uuidv4()}${ext}`
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', module)
  const filePath = `/uploads/${module}/${uniqueName}`

  try {
    await mkdir(uploadDir, { recursive: true })
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(path.join(uploadDir, uniqueName), buffer)
  } catch (writeError) {
    console.error('Failed to save file:', writeError)
    return NextResponse.json({ error: 'Failed to save file' }, { status: 500 })
  }

  // Save to database
  const attachment = await prisma.attachment.create({
    data: {
      module,
      recordId,
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
      uploadedBy: {
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
        },
      },
      createdAt: true,
    },
  })

  return NextResponse.json({ attachment })
}

// DELETE: Remove an attachment
export async function DELETE(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const attachmentId = searchParams.get('attachmentId')

  if (!attachmentId) {
    return NextResponse.json({ error: 'attachmentId query parameter required' }, { status: 400 })
  }

  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
  })

  if (!attachment) {
    return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
  }

  // Check branch access
  let record: { branchId: string } | null = null
  const module = attachment.module
  const recordId = attachment.recordId

  switch (module) {
    case 'incidents':
      record = await prisma.incidentReport.findUnique({
        where: { id: recordId },
        select: { branchId: true },
      })
      break
    case 'attendance':
      record = await prisma.attendanceRecord.findUnique({
        where: { id: recordId },
        select: { branchId: true },
      })
      break
    case 'trainings':
      record = await prisma.training.findUnique({
        where: { id: recordId },
        select: { branchId: true },
      })
      break
    case 'simulations':
      record = await prisma.simulation.findUnique({
        where: { id: recordId },
        select: { branchId: true },
      })
      break
    case 'mock_drills':
      record = await prisma.mockDrill.findUnique({
        where: { id: recordId },
        select: { branchId: true },
      })
      break
    case 'inventory':
      record = await prisma.inventory.findUnique({
        where: { id: recordId },
        select: { branchId: true },
      })
      break
  }

  if (!record) {
    return NextResponse.json({ error: 'Parent record not found' }, { status: 404 })
  }

  if (session.role !== 'ADMIN' && record.branchId !== session.branchId) {
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

  await prisma.attachment.delete({
    where: { id: attachmentId },
  })

  return NextResponse.json({ success: true })
}