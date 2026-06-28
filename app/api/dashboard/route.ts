import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { getBranchFilter } from '@/lib/branchAccess'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const branchId = searchParams.get('branchId')

  // Build branch filter based on role and branch access
  const branchFilter = getBranchFilter(session, branchId)

  // Remove null/undefined values from filter to avoid Prisma type errors
  const cleanBranchFilter = Object.fromEntries(
    Object.entries(branchFilter).filter(([, v]) => v !== null && v !== undefined)
  )

  // Fetch all data in parallel with error handling for each
  let incidents: any[] = []
  let attendanceRecords: any[] = []
  let trainings: any[] = []
  let simulations: any[] = []
  let mockDrills: any[] = []
  let inventory: any[] = []

  try {
    ;[incidents, attendanceRecords, trainings, simulations, mockDrills, inventory] = await Promise.all([
      prisma.incidentReport.findMany({
        where: cleanBranchFilter,
        include: {
          branch: { select: { id: true, name: true } },
          reportedBy: { select: { id: true, name: true } },
        },
        orderBy: { date: 'desc' },
        take: 10,
      }).catch(err => {
        console.error('[DASHBOARD] incidents error:', err)
        return []
      }),
      prisma.attendanceRecord.findMany({
        where: cleanBranchFilter,
        include: {
          branch: { select: { id: true, name: true } },
          recordedBy: { select: { id: true, name: true } },
        },
        orderBy: { date: 'desc' },
        take: 10,
      }).catch(err => {
        console.error('[DASHBOARD] attendance error:', err)
        return []
      }),
      prisma.training.findMany({
        where: cleanBranchFilter,
        include: {
          branch: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { date: 'desc' },
        take: 10,
      }).catch(err => {
        console.error('[DASHBOARD] trainings error:', err)
        return []
      }),
      prisma.simulation.findMany({
        where: cleanBranchFilter,
        include: {
          branch: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { date: 'desc' },
        take: 10,
      }).catch(err => {
        console.error('[DASHBOARD] simulations error:', err)
        return []
      }),
      prisma.mockDrill.findMany({
        where: cleanBranchFilter,
        include: {
          branch: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { date: 'desc' },
        take: 10,
      }).catch(err => {
        console.error('[DASHBOARD] mockDrills error:', err)
        return []
      }),
      prisma.inventory.findMany({
        where: cleanBranchFilter,
        include: {
          branch: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { itemName: 'asc' },
      }).catch(err => {
        console.error('[DASHBOARD] inventory error:', err)
        return []
      }),
    ])
  } catch (queryError) {
    console.error('[DASHBOARD] Fatal error:', queryError)
    return NextResponse.json(
      { error: 'Database query failed', details: queryError instanceof Error ? queryError.message : 'Unknown error' },
      { status: 500 }
    )
  }

  // Get total counts for stats (with individual error handling)
  let totalIncidents = 0, totalAttendance = 0, totalTrainings = 0, totalSimulations = 0, totalMockDrills = 0, totalInventory = 0
  try {
    ;[totalIncidents, totalAttendance, totalTrainings, totalSimulations, totalMockDrills, totalInventory] = await Promise.all([
      prisma.incidentReport.count({ where: cleanBranchFilter }).catch(() => 0),
      prisma.attendanceRecord.count({ where: cleanBranchFilter }).catch(() => 0),
      prisma.training.count({ where: cleanBranchFilter }).catch(() => 0),
      prisma.simulation.count({ where: cleanBranchFilter }).catch(() => 0),
      prisma.mockDrill.count({ where: cleanBranchFilter }).catch(() => 0),
      prisma.inventory.count({ where: cleanBranchFilter }).catch(() => 0),
    ])
  } catch (countError) {
    console.error('[DASHBOARD] Count error:', countError)
  }

  return NextResponse.json({
    stats: {
      incidents: totalIncidents,
      attendance: totalAttendance,
      trainings: totalTrainings,
      simulations: totalSimulations,
      mockDrills: totalMockDrills,
      inventory: totalInventory,
    },
    recentIncidents: incidents,
    recentAttendance: attendanceRecords,
    recentTrainings: trainings,
    recentSimulations: simulations,
    recentMockDrills: mockDrills,
    inventory,
  })
}