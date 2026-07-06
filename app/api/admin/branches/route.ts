import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// Default module configurations for new branches
const DEFAULT_MODULE_CONFIGS = [
  {
    module: 'incidents',
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
  {
    module: 'attendance',
    isEnabled: true,
    customFields: [
      { fieldName: 'employeeName', fieldLabel: 'Employee Name', fieldType: 'text', isRequired: true, order: 0, colSpan: 1 },
      { fieldName: 'date', fieldLabel: 'Date', fieldType: 'date', isRequired: true, order: 1, colSpan: 1 },
      { fieldName: 'status', fieldLabel: 'Status', fieldType: 'select', isRequired: true, order: 2, colSpan: 1, options: 'Present\nAbsent\nLate\nExcused', optionColors: { 'Present': '#10b981', 'Absent': '#ef4444', 'Late': '#f59e0b', 'Excused': '#3b82f6' } },
      { fieldName: 'notes', fieldLabel: 'Notes', fieldType: 'textarea', isRequired: false, order: 3, colSpan: 2 },
    ]
  },
  {
    module: 'trainings',
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
  {
    module: 'simulations',
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
  {
    module: 'mock_drills',
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
  {
    module: 'inventory',
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
]

// GET all branches (admin only)
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const branches = await prisma.branch.findMany({
    include: {
      _count: {
        select: {
          users: true,
          incidentReports: true,
          attendanceRecords: true,
          trainings: true,
          simulations: true,
          mockDrills: true,
          inventories: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ branches })
}

// POST create a new branch (admin only)
export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { name } = await request.json()
  if (!name || !name.trim()) {
    return NextResponse.json(
      { error: 'Branch name is required' },
      { status: 400 }
    )
  }

  try {
    // Create the branch
    const branch = await prisma.branch.create({
      data: { name: name.trim() },
    })

    // Automatically create default module configurations for the new branch
    for (const defaultModule of DEFAULT_MODULE_CONFIGS) {
      await prisma.branchModuleConfig.create({
        data: {
          branchId: branch.id,
          module: defaultModule.module,
          isEnabled: defaultModule.isEnabled,
          customFields: {
            create: defaultModule.customFields.map(field => ({
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
      })
    }

    return NextResponse.json({ branch }, { status: 201 })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A branch with this name already exists' },
        { status: 409 }
      )
    }
    console.error('[ADMIN] Create branch error:', error)
    return NextResponse.json(
      { error: 'Failed to create branch' },
      { status: 500 }
    )
  }
}