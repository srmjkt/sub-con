"use client"

import { AdminDataPage } from "@/components/AdminDataPage"

interface InventoryItem {
  id: string
  itemName: string
  quantity: number
  unit: string
  category: string | null
  status: string
  branch: { id: string; name: string }
  createdBy: { id: string; name: string }
}

const statusColors: Record<string, string> = {
  available: "border-emerald-700/50 bg-emerald-900/30 text-emerald-300",
  low: "border-yellow-700/50 bg-yellow-900/30 text-yellow-300",
  out_of_stock: "border-red-700/50 bg-red-900/30 text-red-300",
}

export default function AdminInventoryPage() {
  return (
    <AdminDataPage<InventoryItem>
      title="Inventory"
      subtitle="Configure and manage inventory across all branches"
      apiEndpoint="/api/data/inventory"
      columns={[
        { key: "itemName", label: "Item Name" },
        { key: "quantity", label: "Quantity" },
        { key: "unit", label: "Unit" },
        { key: "category", label: "Category", render: (item) => item.category || "-" },
        {
          key: "status",
          label: "Status",
          render: (item) => (
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusColors[item.status] || statusColors.available}`}>
              {item.status.replace("_", " ")}
            </span>
          ),
        },
        { key: "branch", label: "Branch", render: (item) => item.branch?.name || "-" },
      ]}
      editFields={[
        { key: "itemName", label: "Item Name", type: "text", required: true },
        { key: "quantity", label: "Quantity", type: "number" },
        { key: "unit", label: "Unit", type: "text" },
        { key: "category", label: "Category", type: "text" },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "available", label: "Available" },
            { value: "low", label: "Low" },
            { value: "out_of_stock", label: "Out of Stock" },
          ],
        },
      ]}
      emptyMessage="No inventory items found in any branch."
    />
  )
}