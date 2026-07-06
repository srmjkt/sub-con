import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { getBranchFilter } from '@/lib/branchAccess'
import { handleFileUpload, parseFormData } from '@/lib/fileUpload'

// GET attendance records (filtered by branch access)
export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const branchId = searchParams.get('branchId')

  const where: Record<string, unknown> = getBranchFilter(session, branchId)

  const attendanceRecords = await prisma.attendanceRecord.findMany({
    where,
    include: {
      branch: { select: { id: true, name: true } },
      recordedBy: { select: { id: true, name: true } },
    },
    orderBy: { date: 'desc' },
  })

  return NextResponse.json({ attendanceRecords })
}

// POST create attendance record (INPUTTER and ADMIN only)
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

  let employeeName: string | null = null
  let date: string | null = null
  let status: string | null = null
  let notes: string | null = null
  let branchId: string | null = null
  let customFieldsData: Record<string, string> | null = null
  let file: File | null = null

  // Check if the request is multipart/form-data (for file uploads)
  const isFormData = request.headers.get('content-type')?.includes('multipart/form-data')

  if (isFormData) {
    const parsed = await parseFormData(request)
    employeeName = parsed.fields['employeeName']
    date = parsed.fields['date']
    status = parsed.fields['status']
    notes = parsed.fields['notes']
    branchId = parsed.fields['branchId']
    customFieldsData = parsed.customFieldsData
    file = parsed.file
  } else {
    const body = await request.json()
    employeeName = body.employeeName
    date = body.date
    status = body.status
    notes = body.notes
    branchId = body.branchId
    customFieldsData = body.customFieldsData
  }

  if (!employeeName || !date) {
    return NextResponse.json(
      { error: 'Employee name and date are required' },
      { status: 400 }
    )
  }

  const targetBranchId =
    session.role === 'ADMIN' ? branchId : session.branchId
  if (!targetBranchId) {
    return NextResponse.json(
      { error: 'Branch assignment is required' },
      { status: 400 }
    )
  }

  const record = await prisma.attendanceRecord.create({
    data: {
      employeeName: employeeName.trim(),
      date: new Date(date),
      status: status || 'present',
      notes: notes || null,
      customFieldsData: customFieldsData || undefined,
      branchId: targetBranchId,
      recordedById: session.userId,
    },
    include: {
      branch: { select: { id: true, name: true } },
      recordedBy: { select: { id: true, name: true } },
    },
  })

  // Handle file upload if present
  if (file && file.size > 0) {
    const uploadResult = await handleFileUpload(file, 'attendance', record.id, session.userId)
    if (!uploadResult.success) {
      console.error('File upload failed:', uploadResult.error)
    }
  }

  return NextResponse.json({ record }, { status: 201 })
}
