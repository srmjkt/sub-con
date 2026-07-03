import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { getBranchFilter } from '@/lib/branchAccess'

// GET incident reports (filtered by branch access)
export async function GET(request: Request) {
  let session
  try {
    session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get('branchId')

    // Build where clause based on role and branch access
    const rawWhere = session.role === 'ADMIN'
      ? (branchId ? { branchId } : undefined)
      : (getBranchFilter(session, branchId) as any)

    // Remove null/undefined values from filter to avoid Prisma type errors
    const where = rawWhere && typeof rawWhere === 'object'
      ? Object.fromEntries(Object.entries(rawWhere).filter(([, v]) => v !== null && v !== undefined))
      : (rawWhere || {})

    const query: Parameters<typeof prisma.incidentReport.findMany>[0] = {
      select: {
        id: true,
        incidentReportNumber: true,
        title: true,
        description: true,
        severity: true,
        date: true,
        location: true,
        status: true,
        branchId: true,
        reportedById: true,
        customFieldsData: true,
        createdAt: true,
        updatedAt: true,
        branch: { select: { id: true, name: true } },
        reportedBy: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    }
    if (where) query.where = where

    const incidents = await prisma.incidentReport.findMany(query)

    return NextResponse.json({ incidents })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : ''
    console.error('Failed to fetch incidents:', errorMessage)
    console.error('Stack:', errorStack)
    console.error('Session:', session ? { userId: session.userId, role: session.role, branchId: session.branchId } : 'null')
    return NextResponse.json(
      { error: 'Failed to fetch incidents', details: errorMessage },
      { status: 500 }
    )
  }
}

// POST create incident report (INPUTTER and ADMIN only)
export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.role === 'VIEWER') {
    return NextResponse.json(
      { error: 'Viewers cannot create records' },
      { status: 403 }
    )
  }

  // Check if the request is multipart/form-data (for file uploads)
  const isFormData = request.headers.get('content-type')?.includes('multipart/form-data')
  
  let title: string | null = null
  let description: string | null = null
  let severity: string | null = null
  let date: string | null = null
  let location: string | null = null
  let status: string | null = null
  let branchId: string | null = null
  let customFieldsData: Record<string, string> | null = null
  let incidentReportNumber: string | null = null
  let isDraft: boolean = false
  let file: File | null = null

  if (isFormData) {
    const formData = await request.formData()
    title = formData.get('title') as string
    description = formData.get('description') as string
    severity = formData.get('severity') as string
    date = formData.get('date') as string
    location = formData.get('location') as string
    status = formData.get('status') as string
    branchId = formData.get('branchId') as string
    incidentReportNumber = formData.get('incidentReportNumber') as string
    isDraft = formData.get('isDraft') === 'true'
    const customFieldsDataStr = formData.get('customFieldsData') as string
    if (customFieldsDataStr) {
      try {
        customFieldsData = JSON.parse(customFieldsDataStr)
      } catch {
        // Ignore parse errors
      }
    }
    file = formData.get('file') as File | null
  } else {
    const body: any = await request.json()
    title = body.title
    description = body.description
    severity = body.severity
    date = body.date
    location = body.location
    status = body.status
    branchId = body.branchId
    customFieldsData = body.customFieldsData
    incidentReportNumber = body.incidentReportNumber
    isDraft = body.isDraft
  }

  // Validate required fields (only for non-draft submissions)
  if (!isDraft && (!title || !description || !date)) {
    return NextResponse.json(
      { error: 'Title, description, and date are required' },
      { status: 400 }
    )
  }

  // Determine the target branch
  const targetBranchId =
    session.role === 'ADMIN' ? branchId : session.branchId
  if (!targetBranchId) {
    return NextResponse.json(
      { error: 'Branch assignment is required' },
      { status: 400 }
    )
  }

  const incident = await prisma.incidentReport.create({
    data: {
      title: title?.trim() || '',
      description: description?.trim() || '',
      severity: severity || 'low',
      date: date ? new Date(date) : new Date(),
      location: location || null,
      incidentReportNumber: incidentReportNumber || null,
      status: status || 'open',
      branchId: targetBranchId,
      reportedById: session.userId,
      customFieldsData: customFieldsData || undefined,
    },
    include: {
      branch: { select: { id: true, name: true } },
      reportedBy: { select: { id: true, name: true } },
    },
  })

  // Handle file upload if present
  if (file && file.size > 0) {
    const { writeFile, mkdir } = await import('fs/promises')
    const path = await import('path')
    const { v4: uuidv4 } = await import('uuid')
    
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
      // Don't fail the request, just log the error
    }

    // Save to database
    await prisma.incidentAttachment.create({
      data: {
        incidentReportId: incident.id,
        fileName: file.name,
        filePath: filePath,
        fileType: file.type,
        fileSize: file.size,
        uploadedById: session.userId,
      },
    })
  }

  return NextResponse.json({ incident }, { status: 201 })
}
