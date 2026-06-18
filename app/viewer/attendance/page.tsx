"use client"

import { ViewerDataPage } from "@/components/ViewerDataPage"

const statusColors: Record<string, string> = {
  present: "border-emerald-700/50 bg-emerald-900/30 text-emerald-300",
  absent: "border-red-700/50 bg-red-900/30 text-red-300",
  late: "border-yellow-700/50 bg-yellow-900/30 text-yellow-300",
  leave: "border-blue-700/50 bg-blue-900/30 text-blue-300",
}

export default function ViewerAttendancePage() {
  return (
    <ViewerDataPage
      title="Attendance Records"
      apiEndpoint="/api/data/attendance"
      emptyMessage="No attendance records available."
      columns={[
        { key: "employeeName", label: "Employee" },
        { key: "date", label: "Date", render: (item) => new Date(item.date as string).toLocaleDateString() },
        { key: "status", label: "Status", render: (item) => (
          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusColors[item.status as string] || ""}`}>
            {item.status as string}
          </span>
        )},
        { key: "notes", label: "Notes" },
        { key: "recordedBy", label: "Recorded By", render: (item) => {
          const rb = item.recordedBy as { name: string } | null
          return rb?.name || "-"
        }},
      ]}
    />
  )
}