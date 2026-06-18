"use client"

import { ViewerDataPage } from "@/components/ViewerDataPage"

const resultColors: Record<string, string> = {
  pass: "border-emerald-700/50 bg-emerald-900/30 text-emerald-300",
  fail: "border-red-700/50 bg-red-900/30 text-red-300",
  partial: "border-yellow-700/50 bg-yellow-900/30 text-yellow-300",
}

export default function ViewerMockDrillsPage() {
  return (
    <ViewerDataPage
      title="Mock Drills"
      apiEndpoint="/api/data/mock-drills"
      emptyMessage="No mock drill records available."
      columns={[
        { key: "title", label: "Title" },
        { key: "date", label: "Date", render: (item) => new Date(item.date as string).toLocaleDateString() },
        { key: "drillType", label: "Type" },
        { key: "participants", label: "Participants" },
        { key: "result", label: "Result", render: (item) => item.result ? (
          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${resultColors[item.result as string] || ""}`}>
            {item.result as string}
          </span>
        ) : "-"},
      ]}
    />
  )
}