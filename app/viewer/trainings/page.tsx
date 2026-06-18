"use client"

import { ViewerDataPage } from "@/components/ViewerDataPage"

const statusColors: Record<string, string> = {
  scheduled: "border-blue-700/50 bg-blue-900/30 text-blue-300",
  completed: "border-emerald-700/50 bg-emerald-900/30 text-emerald-300",
  cancelled: "border-red-700/50 bg-red-900/30 text-red-300",
}

export default function ViewerTrainingsPage() {
  return (
    <ViewerDataPage
      title="Trainings"
      apiEndpoint="/api/data/trainings"
      emptyMessage="No training records available."
      columns={[
        { key: "title", label: "Title" },
        { key: "date", label: "Date", render: (item) => new Date(item.date as string).toLocaleDateString() },
        { key: "duration", label: "Duration" },
        { key: "participants", label: "Participants" },
        { key: "trainer", label: "Trainer" },
        { key: "status", label: "Status", render: (item) => (
          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusColors[item.status as string] || ""}`}>
            {item.status as string}
          </span>
        )},
      ]}
    />
  )
}