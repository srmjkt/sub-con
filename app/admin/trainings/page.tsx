"use client"

import { AdminDataPage } from "@/components/AdminDataPage"

interface Training {
  id: string
  title: string
  description: string | null
  date: string
  duration: string | null
  participants: number
  trainer: string | null
  status: string
  branch: { id: string; name: string }
  createdBy: { id: string; name: string }
}

const statusColors: Record<string, string> = {
  scheduled: "border-blue-700/50 bg-blue-900/30 text-blue-300",
  completed: "border-emerald-700/50 bg-emerald-900/30 text-emerald-300",
  cancelled: "border-red-700/50 bg-red-900/30 text-red-300",
}

export default function AdminTrainingsPage() {
  return (
    <AdminDataPage<Training>
      title="Trainings"
      subtitle="Configure and manage trainings across all branches"
      apiEndpoint="/api/data/trainings"
      columns={[
        { key: "title", label: "Title" },
        { key: "date", label: "Date", render: (item) => new Date(item.date).toLocaleDateString() },
        { key: "duration", label: "Duration", render: (item) => item.duration || "-" },
        { key: "participants", label: "Participants" },
        { key: "trainer", label: "Trainer", render: (item) => item.trainer || "-" },
        {
          key: "status",
          label: "Status",
          render: (item) => (
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusColors[item.status] || statusColors.scheduled}`}>
              {item.status}
            </span>
          ),
        },
        { key: "branch", label: "Branch", render: (item) => item.branch?.name || "-" },
      ]}
      editFields={[
        { key: "title", label: "Title", type: "text", required: true },
        { key: "description", label: "Description", type: "textarea" },
        { key: "date", label: "Date", type: "date", required: true },
        { key: "duration", label: "Duration", type: "text" },
        { key: "participants", label: "Participants", type: "number" },
        { key: "trainer", label: "Trainer", type: "text" },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "scheduled", label: "Scheduled" },
            { value: "completed", label: "Completed" },
            { value: "cancelled", label: "Cancelled" },
          ],
        },
      ]}
      emptyMessage="No trainings found in any branch."
    />
  )
}