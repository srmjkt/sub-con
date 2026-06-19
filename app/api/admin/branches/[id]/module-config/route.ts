import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET module configs for a branch
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
    const configs = await prisma.branchModuleConfig.findMany({
      where: { branchId: id },
      include: {
        customFields: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { module: 'asc' },
    })

    return NextResponse.json({ configs })
  } catch (error) {
    console.error('[ADMIN] Fetch module configs error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch module configs' },
      { status: 500 }
    )
  }
}

// POST create or update module config
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const { module, isEnabled, customFields } = await request.json()

  try {
    // Upsert module config
    const config = await prisma.branchModuleConfig.upsert({
      where: {
        branchId_module: {
          branchId: id,
          module,
        },
      },
      update: {
        isEnabled,
      },
      create: {
        branchId: id,
        module,
        isEnabled,
      },
    })

    // If customFields provided, delete old ones and create new ones
    if (customFields && Array.isArray(customFields)) {
      await prisma.customField.deleteMany({
        where: { moduleConfigId: config.id },
      })

      await prisma.customField.createMany({
        data: customFields.map((field: {
          fieldName: string
          fieldLabel: string
          fieldType: string
          isRequired: boolean
          options?: string
          order: number
        }) => ({
          moduleConfigId: config.id,
          fieldName: field.fieldName,
          fieldLabel: field.fieldLabel,
          fieldType: field.fieldType,
          isRequired: field.isRequired,
          options: field.options || null,
          order: field.order,
        })),
      })
    }

    const updatedConfig = await prisma.branchModuleConfig.findUnique({
      where: { id: config.id },
      include: {
        customFields: {
          orderBy: { order: 'asc' },
        },
      },
    })

    return NextResponse.json({ config: updatedConfig })
  } catch (error) {
    console.error('[ADMIN] Save module config error:', error)
    return NextResponse.json(
      { error: 'Failed to save module config' },
      { status: 500 }
    )
  }
}