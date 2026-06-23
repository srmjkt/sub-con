"use client"

import { AdminDataPage } from "@/components/AdminDataPage"

interface Incident {
  id: string
  title: string
  description: string
  severity: string
  date: string
  location: string | null
  status: string
  branch: { id: string; name: string }
  reportedBy: { id: string; name: string }
  customFieldsData: Record<string, string> | null
}

const severityColors: Record<string, string> = {
  low: "border-slate-700/50 bg-slate-900/30 text-slate-300",
  medium: "border-yellow-700/50 bg-yellow-900/30 text-yellow-300",
  high: "border-orange-700/50 bg-orange-900/30 text-orange-300",
  critical: "border-red-700/50 bg-red-900/30 text-red-300",
}

const statusColors: Record<string, string> = {
  open: "border-red-700/50 bg-red-900/30 text-red-300",
  investigating: "border-yellow-700/50 bg-yellow-900/30 text-yellow-300",
  resolved: "border-emerald-700/50 bg-emerald-900/30 text-emerald-300",
  closed: "border-slate-700/50 bg-slate-900/30 text-slate-300",
}

export default function AdminIncidentsPage() {
  return (
    <AdminDataPage<Incident>
      title="Incidents"
      subtitle="Configure and manage incident reports across all branches"
      apiEndpoint="/api/data/incidents"
      module="incidents"
      columns={[
        { key: "title", label: "Title" },
        {
          key: "severity",
          label: "Severity",
          render: (item) => (
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${severityColors[item.severity] || severityColors.low}`}>
              {item.severity}
            </span>
          ),
        },
        {
          key: "status",
          label: "Status",
          render: (item) => (
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusColors[item.status] || statusColors.open}`}>
              {item.status}
            </span>
          ),
        },
        { key: "date", label: "Date", render: (item) => new Date(item.date).toLocaleDateString() },
        { key: "location", label: "Location", render: (item) => item.location || "-" },
        { key: "branch", label: "Branch", render: (item) => item.branch?.name || "-" },
        { key: "reportedBy", label: "Reported By", render: (item) => item.reportedBy?.name || "-" },
      ]}
      editFields={[
        { key: "title", label: "Title", type: "text", required: true },
        { key: "description", label: "Description", type: "textarea", required: true },
        { key: "date", label: "Date", type: "date", required: true },
        {
          key: "severity",
          label: "Severity",
          type: "select",
          options: [
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
            { value: "critical", label: "Critical" },
          ],
        },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "open", label: "Open" },
            { value: "investigating", label: "Investigating" },
            { value: "resolved", label: "Resolved" },
            { value: "closed", label: "Closed" },
          ],
        },
        { key: "location", label: "Location", type: "text" },
      ]}
      emptyMessage="No incident reports found in any branch."
    />
  )
}