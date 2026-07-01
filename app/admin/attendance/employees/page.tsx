"use client"

import { AdminDataPage } from "@/components/AdminDataPage"

interface Employee {
  id: string
  employeeId: string
  fullName: string
  email: string | null
  phone: string | null
  department: string | null
  position: string | null
  joinDate: string | null
  isActive: boolean
  branchId: string
  branch: { id: string; name: string }
}

export default function AdminAttendanceEmployeesPage() {
  return (
    <AdminDataPage<Employee>
      title="Employee"
      subtitle="Add, edit, and manage employees database"
      apiEndpoint="/api/admin/employees"
      searchable
      searchPlaceholder="Search by name, ID, email..."
      columns={[
        { key: "employeeId", label: "Employee ID" },
        { key: "fullName", label: "Name" },
        { key: "branch", label: "Branch", render: (item) => item.branch?.name || "-" },
        { key: "department", label: "Department", render: (item) => item.department || "-" },
        { key: "position", label: "Position", render: (item) => item.position || "-" },
        { key: "email", label: "Email", render: (item) => item.email || "-" },
        { key: "isActive", label: "Status", render: (item) => (
          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${item.isActive ? 'border-emerald-700/50 bg-emerald-900/30 text-emerald-300' : 'border-slate-700/50 bg-slate-900/30 text-slate-400'}`}>
            {item.isActive ? "Active" : "Inactive"}
          </span>
        )},
      ]}
      editFields={[
        { key: "branchId", label: "Branch", type: "select", required: true, options: [] },
        { key: "employeeId", label: "Employee ID", type: "text", required: true },
        { key: "fullName", label: "Full Name", type: "text", required: true },
        { key: "email", label: "Email", type: "email" },
        { key: "phone", label: "Phone", type: "text" },
        { key: "department", label: "Department", type: "text" },
        { key: "position", label: "Position", type: "text" },
        { key: "joinDate", label: "Join Date", type: "date" },
        { key: "isActive", label: "Active", type: "checkbox" },
      ]}
    />
  )
}