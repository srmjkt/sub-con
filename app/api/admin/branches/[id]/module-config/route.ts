import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET module configs for a branch
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Inputters/viewers can only read configs for their own branch
  if (session.role !== 'ADMIN' && session.branchId !== id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

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
    console.error('[MODULE CONFIG] Fetch module configs error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch module configs' },
      { status: 500 }
    )
  }
}

// DELETE module config
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const module = searchParams.get('module')

  if (!module) {
    return NextResponse.json({ error: 'Module name is required' }, { status: 400 })
  }

  try {
    // Find the module config
    const moduleConfig = await prisma.branchModuleConfig.findUnique({
      where: {
        branchId_module: {
          branchId: id,
          module,
        },
      },
    })

    if (!moduleConfig) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 })
    }

    // Delete the module config (cascade will delete custom fields)
    await prisma.branchModuleConfig.delete({
      where: { id: moduleConfig.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ADMIN] Delete module config error:', error)
    return NextResponse.json(
      { error: 'Failed to delete module config' },
      { status: 500 }
    )
  }
}

// PUT restore default modules
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const moduleToRestore = body.module // Optional: specific module to restore

  // Define default module configurations
  const defaultModuleConfigs: Record<string, { isEnabled: boolean; customFields: any[] }> = {
    incidents: {
      isEnabled: true,
      customFields: [
        { fieldName: 'incidentReportNumber', fieldLabel: 'Incident Report Number', fieldType: 'text', isRequired: true, order: 0, colSpan: 1 },
        { fieldName: 'title', fieldLabel: 'Title', fieldType: 'text', isRequired: true, order: 1, colSpan: 2 },
        { fieldName: 'description', fieldLabel: 'Description', fieldType: 'textarea', isRequired: true, order: 2, colSpan: 2 },
        { fieldName: 'date', fieldLabel: 'Date', fieldType: 'date', isRequired: true, order: 3, colSpan: 1 },
        { fieldName: 'severity', fieldLabel: 'Severity', fieldType: 'select', isRequired: true, order: 4, colSpan: 1, options: 'Low\nMedium\nHigh\nCritical', optionColors: { 'Low': '#10b981', 'Medium': '#f59e0b', 'High': '#ef4444', 'Critical': '#7f1d1d' } },
        { fieldName: 'status', fieldLabel: 'Status', fieldType: 'select', isRequired: true, order: 5, colSpan: 1, options: 'Open\nInvestigating\nResolved\nClosed', optionColors: { 'Open': '#3b82f6', 'Investigating': '#f59e0b', 'Resolved': '#10b981', 'Closed': '#6b7280' } },
        { fieldName: 'location', fieldLabel: 'Location', fieldType: 'text', isRequired: false, order: 6, colSpan: 1 },
      ]
    },
    attendance: {
      isEnabled: true,
      customFields: [
        { fieldName: 'employeeName', fieldLabel: 'Employee Name', fieldType: 'text', isRequired: true, order: 0, colSpan: 1 },
        { fieldName: 'date', fieldLabel: 'Date', fieldType: 'date', isRequired: true, order: 1, colSpan: 1 },
        { fieldName: 'status', fieldLabel: 'Status', fieldType: 'select', isRequired: true, order: 2, colSpan: 1, options: 'Present\nAbsent\nLate\nExcused', optionColors: { 'Present': '#10b981', 'Absent': '#ef4444', 'Late': '#f59e0b', 'Excused': '#3b82f6' } },
        { fieldName: 'notes', fieldLabel: 'Notes', fieldType: 'textarea', isRequired: false, order: 3, colSpan: 2 },
      ]
    },
    trainings: {
      isEnabled: true,
      customFields: [
        { fieldName: 'title', fieldLabel: 'Training Title', fieldType: 'text', isRequired: true, order: 0, colSpan: 2 },
        { fieldName: 'date', fieldLabel: 'Date', fieldType: 'date', isRequired: true, order: 1, colSpan: 1 },
        { fieldName: 'duration', fieldLabel: 'Duration', fieldType: 'text', isRequired: false, order: 2, colSpan: 1 },
        { fieldName: 'trainer', fieldLabel: 'Trainer', fieldType: 'text', isRequired: false, order: 3, colSpan: 1 },
        { fieldName: 'status', fieldLabel: 'Status', fieldType: 'select', isRequired: true, order: 4, colSpan: 1, options: 'Scheduled\nIn Progress\nCompleted\nCancelled', optionColors: { 'Scheduled': '#3b82f6', 'In Progress': '#f59e0b', 'Completed': '#10b981', 'Cancelled': '#ef4444' } },
        { fieldName: 'description', fieldLabel: 'Description', fieldType: 'textarea', isRequired: false, order: 5, colSpan: 2 },
        { fieldName: 'participants', fieldLabel: 'Participants', fieldType: 'number', isRequired: false, order: 6, colSpan: 1 },
      ]
    },
    simulations: {
      isEnabled: true,
      customFields: [
        { fieldName: 'title', fieldLabel: 'Simulation Title', fieldType: 'text', isRequired: true, order: 0, colSpan: 2 },
        { fieldName: 'date', fieldLabel: 'Date', fieldType: 'date', isRequired: true, order: 1, colSpan: 1 },
        { fieldName: 'scenario', fieldLabel: 'Scenario', fieldType: 'text', isRequired: false, order: 2, colSpan: 1 },
        { fieldName: 'participants', fieldLabel: 'Participants', fieldType: 'number', isRequired: false, order: 3, colSpan: 1 },
        { fieldName: 'result', fieldLabel: 'Result', fieldType: 'select', isRequired: false, order: 4, colSpan: 1, options: 'Pass\nFail\nPartial', optionColors: { 'Pass': '#10b981', 'Fail': '#ef4444', 'Partial': '#f59e0b' } },
        { fieldName: 'description', fieldLabel: 'Description', fieldType: 'textarea', isRequired: false, order: 5, colSpan: 2 },
        { fieldName: 'notes', fieldLabel: 'Notes', fieldType: 'textarea', isRequired: false, order: 6, colSpan: 2 },
      ]
    },
    mock_drills: {
      isEnabled: true,
      customFields: [
        { fieldName: 'title', fieldLabel: 'Drill Title', fieldType: 'text', isRequired: true, order: 0, colSpan: 2 },
        { fieldName: 'date', fieldLabel: 'Date', fieldType: 'date', isRequired: true, order: 1, colSpan: 1 },
        { fieldName: 'drillType', fieldLabel: 'Drill Type', fieldType: 'select', isRequired: true, order: 2, colSpan: 1, options: 'Fire\nEvacuation\nEarthquake\nFirst Aid\nSecurity', optionColors: { 'Fire': '#ef4444', 'Evacuation': '#f59e0b', 'Earthquake': '#dc2626', 'First Aid': '#3b82f6', 'Security': '#8b5cf6' } },
        { fieldName: 'participants', fieldLabel: 'Participants', fieldType: 'number', isRequired: false, order: 3, colSpan: 1 },
        { fieldName: 'result', fieldLabel: 'Result', fieldType: 'select', isRequired: false, order: 4, colSpan: 1, options: 'Pass\nFail\nPartial', optionColors: { 'Pass': '#10b981', 'Fail': '#ef4444', 'Partial': '#f59e0b' } },
        { fieldName: 'description', fieldLabel: 'Description', fieldType: 'textarea', isRequired: false, order: 5, colSpan: 2 },
        { fieldName: 'notes', fieldLabel: 'Notes', fieldType: 'textarea', isRequired: false, order: 6, colSpan: 2 },
      ]
    },
    inventory: {
      isEnabled: true,
      customFields: [
        { fieldName: 'itemName', fieldLabel: 'Item Name', fieldType: 'text', isRequired: true, order: 0, colSpan: 2 },
        { fieldName: 'quantity', fieldLabel: 'Quantity', fieldType: 'number', isRequired: true, order: 1, colSpan: 1 },
        { fieldName: 'unit', fieldLabel: 'Unit', fieldType: 'text', isRequired: false, order: 2, colSpan: 1 },
        { fieldName: 'category', fieldLabel: 'Category', fieldType: 'select', isRequired: false, order: 3, colSpan: 1, options: 'Equipment\nSupplies\nSafety\nMedical\nTools', optionColors: { 'Equipment': '#6b7280', 'Supplies': '#3b82f6', 'Safety': '#10b981', 'Medical': '#ef4444', 'Tools': '#f59e0b' } },
        { fieldName: 'status', fieldLabel: 'Status', fieldType: 'select', isRequired: true, order: 4, colSpan: 1, options: 'Available\nLow Stock\nOut of Stock\nMaintenance', optionColors: { 'Available': '#10b981', 'Low Stock': '#f59e0b', 'Out of Stock': '#ef4444', 'Maintenance': '#8b5cf6' } },
        { fieldName: 'description', fieldLabel: 'Description', fieldType: 'textarea', isRequired: false, order: 5, colSpan: 2 },
      ]
    },
  }

  try {
    let createdConfigs = []

    if (moduleToRestore && defaultModuleConfigs[moduleToRestore]) {
      // Restore single module
      const defaultConfig = defaultModuleConfigs[moduleToRestore]
      
      // Delete existing config for this module if it exists
      const existingConfig = await prisma.branchModuleConfig.findUnique({
        where: {
          branchId_module: {
            branchId: id,
            module: moduleToRestore,
          },
        },
      })

      if (existingConfig) {
        await prisma.branchModuleConfig.delete({
          where: { id: existingConfig.id },
        })
      }

      // Create the module with default config
      const config = await prisma.branchModuleConfig.create({
        data: {
          branchId: id,
          module: moduleToRestore,
          isEnabled: defaultConfig.isEnabled,
          customFields: {
            create: defaultConfig.customFields.map((field: any) => ({
              fieldName: field.fieldName,
              fieldLabel: field.fieldLabel,
              fieldType: field.fieldType,
              isRequired: field.isRequired,
              options: field.options || null,
              order: field.order,
              colSpan: field.colSpan || 1,
              optionColors: field.optionColors || {},
            }))
          }
        },
        include: {
          customFields: {
            orderBy: { order: 'asc' }
          }
        }
      })
      createdConfigs.push(config)
    } else if (!moduleToRestore) {
      // Restore all default modules
      // Delete all existing module configs for this branch
      await prisma.branchModuleConfig.deleteMany({
        where: { branchId: id }
      })

      // Create all default modules
      for (const [moduleName, defaultConfig] of Object.entries(defaultModuleConfigs)) {
        const config = await prisma.branchModuleConfig.create({
          data: {
            branchId: id,
            module: moduleName,
            isEnabled: defaultConfig.isEnabled,
            customFields: {
              create: defaultConfig.customFields.map((field: any) => ({
                fieldName: field.fieldName,
                fieldLabel: field.fieldLabel,
                fieldType: field.fieldType,
                isRequired: field.isRequired,
                options: field.options || null,
                order: field.order,
                colSpan: field.colSpan || 1,
                optionColors: field.optionColors || {},
              }))
            }
          },
          include: {
            customFields: {
              orderBy: { order: 'asc' }
            }
          }
        })
        createdConfigs.push(config)
      }
    } else {
      return NextResponse.json({ error: 'Invalid module name' }, { status: 400 })
    }

    return NextResponse.json({ configs: createdConfigs })
  } catch (error) {
    console.error('[ADMIN] Restore default modules error:', error)
    return NextResponse.json(
      { error: 'Failed to restore default modules' },
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
          colSpan?: number
        }) => ({
          moduleConfigId: config.id,
          fieldName: field.fieldName,
          fieldLabel: field.fieldLabel,
          fieldType: field.fieldType,
          isRequired: field.isRequired,
          options: field.options || null,
          order: field.order,
          colSpan: field.colSpan ?? 1,
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