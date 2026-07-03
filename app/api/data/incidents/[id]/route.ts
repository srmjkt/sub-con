import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET single incident
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
    select: {
      id: true,
      title: true,
      description: true,
      severity: true,
      date: true,
      location: true,
      status: true,
      branchId: true,
      reportedById: true,
      customFieldsData: true,
      incidentReportNumber: true,
      createdAt: true,
      updatedAt: true,
      branch: { select: { id: true, name: true } },
      reportedBy: { select: { id: true, name: true } }
    },
  })

  if (!incident) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (session.role !== 'ADMIN' && incident.branchId !== session.branchId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ incident })
}

// PUT update incident (ADMIN and INPUTTER)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.role === 'VIEWER') {
    return NextResponse.json(
      { error: 'Viewers cannot update records' },
      { status: 403 }
    )
  }

  const { id } = await params

  const existing = await prisma.incidentReport.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      severity: true,
      date: true,
      location: true,
      status: true,
      branchId: true,
      reportedById: true,
      customFieldsData: true,
      incidentReportNumber: true, // <-- Explicitly select the new field for type safety
    }
  })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (session.role !== 'ADMIN' && existing.branchId !== session.branchId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Check if the request is multipart/form-data (for file uploads)
  const isFormData = request.headers.get('content-type')?.includes('multipart/form-data')
  
  let title: string | undefined = undefined
  let description: string | undefined = undefined
  let severity: string | undefined = undefined
  let date: string | undefined = undefined
  let location: string | undefined = undefined
  let status: string | undefined = undefined
  let branchId: string | undefined = undefined
  let customFieldsData: Record<string, string> | undefined = undefined
  let incidentReportNumber: string | undefined = undefined
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
    const body = await request.json()
    title = body.title
    description = body.description
    severity = body.severity
    date = body.date
    location = body.location
    status = body.status
    branchId = body.branchId
    customFieldsData = body.customFieldsData
    incidentReportNumber = body.incidentReportNumber
  }

  // Track changes for edit history
  const changes: { fieldName: string; oldValue: string | null; newValue: string | null }[] = []

  if (title !== undefined && title.trim() !== existing.title) {
    changes.push({ fieldName: 'title', oldValue: existing.title, newValue: title.trim() })
  }
  if (description !== undefined && description.trim() !== existing.description) {
    changes.push({ fieldName: 'description', oldValue: existing.description, newValue: description.trim() })
  }
  if (severity !== undefined && severity !== existing.severity) {
    changes.push({ fieldName: 'severity', oldValue: existing.severity, newValue: severity })
  }
  if (date !== undefined && new Date(date).toISOString() !== new Date(existing.date).toISOString()) {
    changes.push({ fieldName: 'date', oldValue: existing.date.toISOString(), newValue: new Date(date).toISOString() })
  }
  if (location !== undefined && (location || null) !== existing.location) {
    changes.push({ fieldName: 'location', oldValue: existing.location, newValue: location || null })
  }
  if (status !== undefined && status !== existing.status) {
    changes.push({ fieldName: 'status', oldValue: existing.status, newValue: status })
  }

  // Safely compare against potential null/undefined existing field and handle empty string input gracefully.
  const existingReportNumber = existing.incidentReportNumber ?? null;
  let currentReportNumberValue: any = incidentReportNumber === undefined ? undefined : (typeof incidentReportNumber === 'string' && incidentReportNumber.trim() === '' ? '' : String(incidentReportNumber));

  if (currentReportNumberValue !== undefined && String(currentReportNumberValue).trim() !== String(existingReportNumber).trim()) {
    changes.push({ fieldName: 'incidentReportNumber', oldValue: existing.incidentReportNumber ?? null, newValue: currentReportNumberValue })
  }


  const incident = await prisma.incidentReport.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description: description.trim() }),
      ...(severity !== undefined && { severity }),
      ...(date !== undefined && { date: new Date(date) }),
      ...(location !== undefined && { location: location || null }),
       ...(status !== undefined && { status }),
      // Handle incidentReportNumber: If provided, update. Set to NULL if the input is an empty string.
      ...(incidentReportNumber !== undefined && { incidentReportNumber: (incidentReportNumber === '' ? null : incidentReportNumber) }),
      ...(branchId !== undefined && session.role === 'ADMIN' && { branchId }),
     // Custom fields are handled dynamically here, allowing for unlimited keys and graceful null handling upon deletion.
    ...(customFieldsData !== undefined && { customFieldsData }),
    },
    select: {
      id: true,
      title: true,
      description: true,
      severity: true,
      date: true,
      location: true,
      status: true,
      branchId: true,
      reportedById: true,
      customFieldsData: true,
      incidentReportNumber: true,
      createdAt: true,
      updatedAt: true,
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
        incidentReportId: id,
        fileName: file.name,
        filePath: filePath,
        fileType: file.type,
        fileSize: file.size,
        uploadedById: session.userId,
      },
    })
  }

  // Save edit history
  if (changes.length > 0) {
    await prisma.incidentReportEdit.createMany({
      data: changes.map((change) => ({
        incidentReportId: id,
        editedById: session.userId,
        fieldName: change.fieldName,
        oldValue: change.oldValue,
        newValue: change.newValue,
      })),
    })
  }

  return NextResponse.json({ incident })
}


// DELETE incident (ADMIN only)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Only admins can delete records' },
      { status: 403 }
    )
  }

  const { id } = await params

  const existing = await prisma.incidentReport.findUnique({
    where: { id },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.incidentReport.delete({
    where: { id },
  })

  return NextResponse.json({ success: true })
}