import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { getBranchFilter } from '@/lib/branchAccess'
import { handleFileUpload, parseFormData } from '@/lib/fileUpload'

// GET inventory (filtered by branch access)
export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const branchId = searchParams.get('branchId')

  const where: Record<string, unknown> = getBranchFilter(session, branchId)

  const inventory = await prisma.inventory.findMany({
    where,
    include: {
      branch: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { itemName: 'asc' },
  })

  return NextResponse.json({ inventory })
}

// POST create inventory item (INPUTTER and ADMIN only)
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

  let itemName: string | null = null
  let quantity: string | null = null
  let unit: string | null = null
  let category: string | null = null
  let status: string | null = null
  let description: string | null = null
  let branchId: string | null = null
  let customFieldsData: Record<string, string> | null = null
  let file: File | null = null

  // Check if the request is multipart/form-data (for file uploads)
  const isFormData = request.headers.get('content-type')?.includes('multipart/form-data')

  if (isFormData) {
    const parsed = await parseFormData(request)
    itemName = parsed.fields['itemName']
    quantity = parsed.fields['quantity']
    unit = parsed.fields['unit']
    category = parsed.fields['category']
    status = parsed.fields['status']
    description = parsed.fields['description']
    branchId = parsed.fields['branchId']
    customFieldsData = parsed.customFieldsData
    file = parsed.file
  } else {
    const body = await request.json()
    itemName = body.itemName
    quantity = body.quantity
    unit = body.unit
    category = body.category
    status = body.status
    description = body.description
    branchId = body.branchId
    customFieldsData = body.customFieldsData
  }

  if (!itemName) {
    return NextResponse.json(
      { error: 'Item name is required' },
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

  const inventory = await prisma.inventory.create({
    data: {
      itemName: itemName.trim(),
      quantity: quantity ? parseInt(quantity) : 0,
      unit: unit || 'pcs',
      category: category || null,
      status: status || 'available',
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
    const uploadResult = await handleFileUpload(file, 'inventory', inventory.id, session.userId)
    if (!uploadResult.success) {
      console.error('File upload failed:', uploadResult.error)
    }
  }

  return NextResponse.json({ inventory }, { status: 201 })
}
