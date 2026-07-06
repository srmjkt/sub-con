import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { getBranchFilter } from '@/lib/branchAccess'
import { handleFileUpload, parseFormData } from '@/lib/fileUpload'

// GET trainings (filtered by branch access)
export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const branchId = searchParams.get('branchId')

  const where: Record<string, unknown> = getBranchFilter(session, branchId)

  const trainings = await prisma.training.findMany({
    where,
    include: {
      branch: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { date: 'desc' },
  })

  return NextResponse.json({ trainings })
}

// POST create training (INPUTTER and ADMIN only)
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

  let title: string | null = null
  let description: string | null = null
  let date: string | null = null
  let duration: string | null = null
  let participants: string | null = null
  let trainer: string | null = null
  let status: string | null = null
  let branchId: string | null = null
  let customFieldsData: Record<string, string> | null = null
  let file: File | null = null

  // Check if the request is multipart/form-data (for file uploads)
  const isFormData = request.headers.get('content-type')?.includes('multipart/form-data')

  if (isFormData) {
    const parsed = await parseFormData(request)
    title = parsed.fields['title']
    description = parsed.fields['description']
    date = parsed.fields['date']
    duration = parsed.fields['duration']
    participants = parsed.fields['participants']
    trainer = parsed.fields['trainer']
    status = parsed.fields['status']
    branchId = parsed.fields['branchId']
    customFieldsData = parsed.customFieldsData
    file = parsed.file
  } else {
    const body = await request.json()
    title = body.title
    description = body.description
    date = body.date
    duration = body.duration
    participants = body.participants
    trainer = body.trainer
    status = body.status
    branchId = body.branchId
    customFieldsData = body.customFieldsData
  }

  if (!title || !date) {
    return NextResponse.json(
      { error: 'Title and date are required' },
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

  const training = await prisma.training.create({
    data: {
      title: title.trim(),
      description: description || null,
      date: new Date(date),
      duration: duration || null,
      participants: participants ? parseInt(participants) : 0,
      trainer: trainer || null,
      status: status || 'scheduled',
      customFieldsData: customFieldsData || undefined,
      branchId: targetBranchId,
      createdById: session.userId,
    },
    include: {
      branch: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  })

  // Handle file upload if present
  if (file && file.size > 0) {
    const uploadResult = await handleFileUpload(file, 'trainings', training.id, session.userId)
    if (!uploadResult.success) {
      console.error('File upload failed:', uploadResult.error)
    }
  }

  return NextResponse.json({ training }, { status: 201 })
}
