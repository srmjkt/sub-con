"use client"

import { AdminDataPage } from "@/components/AdminDataPage"

interface Simulation {
  id: string
  title: string
  description: string | null
  date: string
  participants: number
  scenario: string | null
  result: string | null
  notes: string | null
  branch: { id: string; name: string }
  createdBy: { id: string; name: string }
}

const resultColors: Record<string, string> = {
  pass: "border-emerald-700/50 bg-emerald-900/30 text-emerald-300",
  fail: "border-red-700/50 bg-red-900/30 text-red-300",
  partial: "border-yellow-700/50 bg-yellow-900/30 text-yellow-300",
}

export default function AdminSimulationsPage() {
  return (
    <AdminDataPage<Simulation>
      title="Simulations"
      subtitle="Configure and manage simulations across all branches"
      apiEndpoint="/api/data/simulations"
      columns={[
        { key: "title", label: "Title" },
        { key: "date", label: "Date", render: (item) => new Date(item.date).toLocaleDateString() },
        { key: "participants", label: "Participants" },
        { key: "scenario", label: "Scenario", render: (item) => item.scenario || "-" },
        {
          key: "result",
          label: "Result",
          render: (item) => item.result ? (
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${resultColors[item.result] || ""}`}>
              {item.result}
            </span>
          ) : "-",
        },
        { key: "branch", label: "Branch", render: (item) => item.branch?.name || "-" },
      ]}
      editFields={[
        { key: "title", label: "Title", type: "text", required: true },
        { key: "description", label: "Description", type: "textarea" },
        { key: "date", label: "Date", type: "date", required: true },
        { key: "participants", label: "Participants", type: "number" },
        { key: "scenario", label: "Scenario", type: "textarea" },
        {
          key: "result",
          label: "Result",
          type: "select",
          options: [
            { value: "", label: "Not Specified" },
            { value: "pass", label: "Pass" },
            { value: "fail", label: "Fail" },
            { value: "partial", label: "Partial" },
          ],
        },
        { key: "notes", label: "Notes", type: "textarea" },
      ]}
      emptyMessage="No simulations found in any branch."
    />
  )
}