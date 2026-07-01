"use client"

import { AdminDataPage } from "@/components/AdminDataPage"

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

export default function AdminAttendanceRecordsPage() {
  return (
    <AdminDataPage<AttendanceRecord>
      title="Attendance Records"
      subtitle="View and manage attendance records across all branches"
      apiEndpoint="/api/data/attendance"
      columns={[
        { key: "employeeName", label: "Employee Name" },
        {
          key: "status",
          label: "Status",
          render: (item) => (
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusColors[item.status] || statusColors.present}`}>
              {item.status}
            </span>
          ),
        },
        { key: "date", label: "Date", render: (item) => new Date(item.date).toLocaleDateString() },
        { key: "notes", label: "Notes", render: (item) => item.notes || "-" },
        { key: "branch", label: "Branch", render: (item) => item.branch?.name || "-" },
        { key: "recordedBy", label: "Recorded By", render: (item) => item.recordedBy?.name || "-" },
      ]}
      editFields={[
        { key: "employeeName", label: "Employee Name", type: "text", required: true },
        { key: "date", label: "Date", type: "date", required: true },
        {
          key: "status",
          label: "Status",
          type: "select",
          required: true,
          options: [
            { value: "present", label: "Present" },
            { value: "absent", label: "Absent" },
            { value: "late", label: "Late" },
            { value: "leave", label: "Leave" },
          ],
        },
        { key: "notes", label: "Notes", type: "textarea" },
      ]}
    />
  )
}