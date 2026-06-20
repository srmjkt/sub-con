import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const branchId = searchParams.get('branchId')

  // Build branch filter based on role
  const branchFilter: Record<string, string> = {}
  if (session.role === 'ADMIN') {
    if (branchId) branchFilter.branchId = branchId
  } else {
    if (!session.branchId) {
      return NextResponse.json({
        stats: { incidents: 0, attendance: 0, trainings: 0, simulations: 0, mockDrills: 0, inventory: 0 },
        recentIncidents: [],
        recentAttendance: [],
        recentTrainings: [],
        recentSimulations: [],
        recentMockDrills: [],
        inventory: [],
      })
    }
    branchFilter.branchId = session.branchId
  }

  // Fetch all data in parallel
  let incidents, attendanceRecords, trainings, simulations, mockDrills, inventory
  try {
    [
      incidents,
      attendanceRecords,
      trainings,
      simulations,
      mockDrills,
      inventory,
    ] = await Promise.all([
      prisma.incidentReport.findMany({
      where: branchFilter,
      include: {
        branch: { select: { id: true, name: true } },
        reportedBy: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
      take: 10,
    }),
    prisma.attendanceRecord.findMany({
      where: branchFilter,
      include: {
        branch: { select: { id: true, name: true } },
        recordedBy: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
      take: 10,
    }),
    prisma.training.findMany({
      where: branchFilter,
      include: {
        branch: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
      take: 10,
    }),
    prisma.simulation.findMany({
      where: branchFilter,
      include: {
        branch: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
      take: 10,
    }),
    prisma.mockDrill.findMany({
      where: branchFilter,
      include: {
        branch: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
      take: 10,
    }),
      prisma.inventory.findMany({
        where: branchFilter,
        include: {
          branch: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { itemName: 'asc' },
      }),
    ])
  } catch (queryError) {
    console.error('[DASHBOARD] Query error:', queryError)
    return NextResponse.json(
      { error: 'Database query failed', details: queryError instanceof Error ? queryError.message : 'Unknown error' },
      { status: 500 }
    )
  }

  // Get total counts for stats
  const [
    totalIncidents,
    totalAttendance,
    totalTrainings,
    totalSimulations,
    totalMockDrills,
    totalInventory,
  ] = await Promise.all([
    prisma.incidentReport.count({ where: branchFilter }),
    prisma.attendanceRecord.count({ where: branchFilter }),
    prisma.training.count({ where: branchFilter }),
    prisma.simulation.count({ where: branchFilter }),
    prisma.mockDrill.count({ where: branchFilter }),
    prisma.inventory.count({ where: branchFilter }),
  ])

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