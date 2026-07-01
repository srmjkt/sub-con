"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

interface AttendanceRecord {
  id: string
  employeeName: string
  date: string
  status: string
  notes: string | null
  branch: { id: string; name: string }
  recordedBy: { id: string; name: string }
}

const statusColors: Record<string, string> = {
  present: "border-emerald-700/50 bg-emerald-900/30 text-emerald-300",
  absent: "border-red-700/50 bg-red-900/30 text-red-300",
  late: "border-yellow-700/50 bg-yellow-900/30 text-yellow-300",
  leave: "border-blue-700/50 bg-blue-900/30 text-blue-300",
}

export default function AdminAttendancePage() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace("/admin/attendance/records")
  }, [router])
  
  return null
}
