import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const branchId = searchParams.get("branchId")
    const q = searchParams.get("q") || ""
    const page = parseInt(searchParams.get("page") || "1")
    const limit = 20
    const skip = (page - 1) * limit

    const where: any = {}
    if (branchId) where.branchId = branchId
    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        { employeeId: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { department: { contains: q, mode: "insensitive" } },
        { position: { contains: q, mode: "insensitive" } },
      ]
    }

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        include: { branch: { select: { id: true, name: true } } },
        orderBy: { fullName: "asc" },
        skip,
        take: limit,
      }),
      prisma.employee.count({ where }),
    ])

    return NextResponse.json({ employees, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { branchId, employeeId, fullName, email, phone, department, position, joinDate, isActive } = body

    if (!branchId || !employeeId || !fullName) {
      return NextResponse.json({ error: "branchId, employeeId, and fullName are required" }, { status: 400 })
    }

    // Check uniqueness
    const existing = await prisma.employee.findUnique({
      where: { branchId_employeeId: { branchId, employeeId } },
    })
    if (existing) {
      return NextResponse.json({ error: "Employee ID already exists in this branch" }, { status: 409 })
    }

    const employee = await prisma.employee.create({
      data: {
        branchId,
        employeeId,
        fullName,
        email,
        phone,
        department,
        position,
        joinDate: joinDate ? new Date(joinDate) : null,
        isActive: isActive ?? true,
      },
      include: { branch: { select: { id: true, name: true } } },
    })

    return NextResponse.json({ employee })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create employee" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { id, employeeId, fullName, email, phone, department, position, joinDate, isActive, branchId } = body

    if (!id) {
      return NextResponse.json({ error: "Employee ID is required" }, { status: 400 })
    }

    const existing = await prisma.employee.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        employeeId: employeeId ?? existing.employeeId,
        fullName: fullName ?? existing.fullName,
        email: email !== undefined ? email : existing.email,
        phone: phone !== undefined ? phone : existing.phone,
        department: department !== undefined ? department : existing.department,
        position: position !== undefined ? position : existing.position,
        joinDate: joinDate !== undefined ? (joinDate ? new Date(joinDate) : null) : existing.joinDate,
        isActive: isActive !== undefined ? isActive : existing.isActive,
        branchId: branchId ?? existing.branchId,
      },
      include: { branch: { select: { id: true, name: true } } },
    })

    return NextResponse.json({ employee })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update employee" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "Employee ID is required" }, { status: 400 })
    }

    await prisma.employee.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete employee" }, { status: 500 })
  }
}