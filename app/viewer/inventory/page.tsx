"use client"

import { ViewerDataPage } from "@/components/ViewerDataPage"

const statusColors: Record<string, string> = {
  available: "border-emerald-700/50 bg-emerald-900/30 text-emerald-300",
  low: "border-yellow-700/50 bg-yellow-900/30 text-yellow-300",
  out_of_stock: "border-red-700/50 bg-red-900/30 text-red-300",
}

export default function ViewerInventoryPage() {
  return (
    <ViewerDataPage
      title="Inventory"
      apiEndpoint="/api/data/inventory"
      emptyMessage="No inventory items available."
      columns={[
        { key: "itemName", label: "Item" },
        { key: "quantity", label: "Qty" },
        { key: "unit", label: "Unit" },
        { key: "category", label: "Category" },
        { key: "status", label: "Status", render: (item) => (
          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusColors[item.status as string] || ""}`}>
            {(item.status as string).replace("_", " ")}
          </span>
        )},
        { key: "lastUpdated", label: "Last Updated", render: (item) => new Date(item.lastUpdated as string).toLocaleDateString() },
      ]}
    />
  )
}