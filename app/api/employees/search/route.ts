import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !session.branchId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const q = searchParams.get("q") || ""
    const branchId = searchParams.get("branchId") || session.branchId

    const where: any = { branchId, isActive: true }
    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        { employeeId: { contains: q, mode: "insensitive" } },
      ]
    }

    const employees = await prisma.employee.findMany({
      where,
      orderBy: { fullName: "asc" },
      take: 50,
      select: {
        id: true,
        employeeId: true,
        fullName: true,
        email: true,
        department: true,
        position: true,
      },
    })

    return NextResponse.json({ employees })
  } catch (error) {
    return NextResponse.json({ error: "Failed to search employees" }, { status: 500 })
  }
}