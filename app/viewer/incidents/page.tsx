"use client"

import { ViewerDataPage } from "@/components/ViewerDataPage"

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

export default function ViewerIncidentsPage() {
  return (
    <ViewerDataPage
      title="Incident Reports"
      apiEndpoint="/api/data/incidents"
      emptyMessage="No incident reports available."
      columns={[
        { key: "title", label: "Title" },
        { key: "severity", label: "Severity", render: (item) => (
          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${severityColors[item.severity as string] || ""}`}>
            {item.severity as string}
          </span>
        )},
        { key: "status", label: "Status", render: (item) => (
          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusColors[item.status as string] || ""}`}>
            {item.status as string}
          </span>
        )},
        { key: "date", label: "Date", render: (item) => new Date(item.date as string).toLocaleDateString() },
        { key: "location", label: "Location" },
        { key: "reportedBy", label: "Reported By", render: (item) => {
          const rb = item.reportedBy as { name: string } | null
          return rb?.name || "-"
        }},
      ]}
    />
  )
}