"use client"

import { useState, useEffect, useCallback } from "react"

interface Attachment {
  id: string
  fileName: string
  filePath: string
  fileType: string
  fileSize: number
  createdAt: string
}

interface IncidentFileUploadProps {
  incidentId: string
  canUpload: boolean
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(fileType: string): string {
  if (fileType.startsWith("image/")) return "🖼️"
  if (fileType.startsWith("audio/")) return "🎵"
  if (fileType.startsWith("video/")) return "🎬"
  if (fileType.includes("pdf")) return "📄"
  if (fileType.includes("spreadsheet") || fileType.includes("excel")) return "📊"
  if (fileType.includes("word") || fileType.includes("document")) return "📝"
  return "📎"
}

export function IncidentFileUpload({ incidentId, canUpload }: IncidentFileUploadProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchAttachments = useCallback(async () => {
    try {
      const res = await fetch(`/api/data/incidents/${incidentId}/attachments`)
      const data = await res.json()
      if (res.ok) {
        setAttachments(data.attachments || [])
      }
    } catch {
      setError("Failed to load attachments")
    }
    setLoading(false)
  }, [incidentId])

  // Fetch on mount
  useEffect(() => {
    fetchAttachments()
  }, [fetchAttachments])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError("")

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch(`/api/data/incidents/${incidentId}/attachments`, {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to upload file")
      } else {
        await fetchAttachments()
      }
    } catch {
      setError("Failed to upload file")
    }
    setUploading(false)
    // Reset input
    e.target.value = ""
  }

  async function handleDelete(attachmentId: string) {
    if (!confirm("Delete this attachment?")) return
    setDeleting(attachmentId)
    setError("")

    try {
      const res = await fetch(
        `/api/data/incidents/${incidentId}/attachments?attachmentId=${attachmentId}`,
        { method: "DELETE" }
      )
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to delete attachment")
      } else {
        await fetchAttachments()
      }
    } catch {
      setError("Failed to delete attachment")
    }
    setDeleting(null)
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
        <p className="text-sm text-slate-400">Loading attachments...</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Attachments ({attachments.length})
      </h3>

      {error && (
        <p className="text-sm text-red-400 mb-3">{error}</p>
      )}

      {/* Upload button */}
      {canUpload && (
        <div className="mb-4">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20">
            {uploading ? "Uploading..." : "📎 Upload File"}
            <input
              type="file"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
              accept="image/*,audio/*,video/*,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            />
          </label>
          <p className="text-xs text-slate-500 mt-2">Accepted: Images, Audio, Video, PDF, Word, Excel, Text (max 10MB per file)</p>
        </div>
      )}

      {/* Attachment list */}
      {attachments.length === 0 ? (
        <p className="text-sm text-slate-500">No attachments yet.</p>
      ) : (
        <div className="space-y-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/5 p-3"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="text-lg shrink-0">{getFileIcon(att.fileType)}</span>
                <div className="min-w-0">
                  <a
                    href={att.filePath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-cyan-400 hover:text-cyan-300 hover:underline truncate block"
                    title={att.fileName}
                  >
                    {att.fileName}
                  </a>
                  <p className="text-xs text-slate-500">
                    {formatFileSize(att.fileSize)} · {new Date(att.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {canUpload && (
                <button
                  onClick={() => handleDelete(att.id)}
                  disabled={deleting === att.id}
                  className="shrink-0 rounded-lg border border-red-700/30 bg-red-900/20 px-2 py-1 text-xs text-red-300 transition hover:bg-red-900/40 disabled:opacity-50"
                >
                  {deleting === att.id ? "..." : "🗑️"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}