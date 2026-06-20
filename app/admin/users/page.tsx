"use client"

import { useAuth } from "@/hooks/useAuth"
import { Sidebar } from "@/components/Sidebar"
import { useState, useEffect } from "react"

interface Branch {
  id: string
  name: string
}

interface User {
  id: string
  name: string
  username: string
  email: string
  role: "ADMIN" | "INPUTTER" | "VIEWER"
  branchId: string | null
  branch: { id: string; name: string } | null
  createdAt: string
}

const VALID_USERNAME_REGEX = /^[a-zA-Z0-9._]+$/

function validateUsername(username: string): string | null {
  if (!username || !username.trim()) {
    return "Username is required"
  }
  if (username.length < 3) {
    return "Username must be at least 3 characters"
  }
  if (!VALID_USERNAME_REGEX.test(username)) {
    return "Username can only contain letters, numbers, dots (.), and underscores (_)"
  }
  return null
}

export default function AdminUsersPage() {
  const { user: currentUser, loading: authLoading } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showProfileEdit, setShowProfileEdit] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())

  // Form state for new user
  const [formName, setFormName] = useState("")
  const [formUsername, setFormUsername] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formPassword, setFormPassword] = useState("")
  const [formRole, setFormRole] = useState<"ADMIN" | "INPUTTER" | "VIEWER">("VIEWER")
  const [formBranchId, setFormBranchId] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Profile edit state
  const [profileName, setProfileName] = useState("")
  const [profileUsername, setProfileUsername] = useState("")
  const [profileEmail, setProfileEmail] = useState("")
  const [profileOldPassword, setProfileOldPassword] = useState("")
  const [profilePassword, setProfilePassword] = useState("")
  const [profileSubmitting, setProfileSubmitting] = useState(false)

  async function fetchData() {
    const [usersRes, branchesRes] = await Promise.all([
      fetch("/api/admin/users"),
      fetch("/api/admin/branches"),
    ])
    const usersData = await usersRes.json()
    const branchesData = await branchesRes.json()
    setUsers(usersData.users || [])
    setBranches(branchesData.branches || [])
    setLoading(false)
  }

  useEffect(() => {
    if (currentUser) fetchData()
  }, [currentUser])

  // Initialize profile form when opening profile edit
  function openProfileEdit() {
    if (currentUser) {
      setProfileName(currentUser.name)
      setProfileUsername(currentUser.username || "")
      setProfileEmail(currentUser.email)
      setProfileOldPassword("")
      setProfilePassword("")
      setShowProfileEdit(true)
    }
  }

  async function handleProfileUpdate(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    const usernameError = validateUsername(profileUsername)
    if (usernameError) {
      setError(usernameError)
      return
    }

    // If changing password, old password is required
    if (profilePassword && !profileOldPassword) {
      setError("Please enter your old password to change to a new password")
      return
    }

    setProfileSubmitting(true)

    try {
      const res = await fetch(`/api/admin/users/${currentUser?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileName,
          username: profileUsername,
          email: profileEmail,
          oldPassword: profileOldPassword || undefined,
          password: profilePassword || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to update profile")
        setProfileSubmitting(false)
        return
      }
      setSuccess("Profile updated successfully")
      setShowProfileEdit(false)
      setProfileOldPassword("")
      setProfilePassword("")
      await fetchData()
    } catch {
      setError("An error occurred")
    }
    setProfileSubmitting(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    // Validate username client-side
    const usernameError = validateUsername(formUsername)
    if (usernameError) {
      setError(usernameError)
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          username: formUsername,
          email: formEmail,
          password: formPassword,
          role: formRole,
          branchId: formBranchId || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to create user")
        setSubmitting(false)
        return
      }
      resetForm()
      await fetchData()
    } catch {
      setError("An error occurred")
    }
    setSubmitting(false)
  }

  function toggleSelectUser(id: string) {
    const newSelected = new Set(selectedUserIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedUserIds(newSelected)
  }

  function toggleSelectAll() {
    if (selectedUserIds.size === users.length) {
      setSelectedUserIds(new Set())
    } else {
      setSelectedUserIds(new Set(users.map((u) => u.id)))
    }
  }

  async function handleBulkDelete() {
    if (selectedUserIds.size === 0) {
      setError("Please select at least one user to delete")
      return
    }
    if (!confirm(`Are you sure you want to delete ${selectedUserIds.size} user(s)?`)) return
    try {
      const res = await fetch("/api/admin/users/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: Array.from(selectedUserIds) }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to delete users")
        return
      }
      setSuccess(data.message)
      setSelectedUserIds(new Set())
      await fetchData()
    } catch {
      setError("Failed to delete users")
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this user?")) return
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to delete user")
        return
      }
      await fetchData()
    } catch {
      setError("Failed to delete user")
    }
  }

  async function handleRoleChange(id: string, newRole: string) {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to update user")
        return
      }
      await fetchData()
    } catch {
      setError("Failed to update user")
    }
  }

  async function handleBranchChange(id: string, newBranchId: string) {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId: newBranchId || null }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to update user")
        return
      }
      await fetchData()
    } catch {
      setError("Failed to update user")
    }
  }

  function resetForm() {
    setFormName("")
    setFormUsername("")
    setFormEmail("")
    setFormPassword("")
    setFormRole("VIEWER")
    setFormBranchId("")
    setShowForm(false)
    setError("")
  }

  const roleColors = {
    ADMIN: "border-purple-700/50 bg-purple-900/30 text-purple-300",
    INPUTTER: "border-cyan-700/50 bg-cyan-900/30 text-cyan-300",
    VIEWER: "border-emerald-700/50 bg-emerald-900/30 text-emerald-300",
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (!currentUser) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <Sidebar role={currentUser.role} />

      <main className="ml-64 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-sky-950/30 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white">
                  User Management
                </h1>
                <p className="mt-2 text-sm text-slate-300">
                  Create users with unique usernames and assign them to branches with specific roles
                </p>
              </div>
              <button
                onClick={() => setShowForm(!showForm)}
                className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 font-medium text-cyan-100 transition hover:bg-cyan-400/20"
              >
                {showForm ? "Cancel" : "+ Add User"}
              </button>
            </div>
          </section>

          {/* Error */}
          {error && (
            <div className="rounded-2xl border border-red-700/50 bg-red-900/30 px-4 py-3 text-sm text-red-300">
              {error}
              <button onClick={() => setError("")} className="ml-2 underline">Dismiss</button>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="rounded-2xl border border-emerald-700/50 bg-emerald-900/30 px-4 py-3 text-sm text-emerald-300">
              {success}
              <button onClick={() => setSuccess("")} className="ml-2 underline">Dismiss</button>
            </div>
          )}

          {/* Profile Edit Section */}
          {showProfileEdit && (
            <section className="rounded-[28px] border border-purple-400/20 bg-white/5 p-6 backdrop-blur">
              <h2 className="text-lg font-semibold text-white mb-4">Edit Your Profile</h2>
              <form onSubmit={handleProfileUpdate} className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Username <span className="text-slate-500">(letters, numbers, . and _ only)</span>
                  </label>
                  <input
                    type="text"
                    value={profileUsername}
                    onChange={(e) => setProfileUsername(e.target.value)}
                    required
                    minLength={3}
                    pattern="^[a-zA-Z0-9._]+$"
                    className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none"
                    placeholder="e.g. admin"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none"
                    placeholder="admin@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Old Password <span className="text-red-400">(required to change password)</span>
                  </label>
                  <input
                    type="password"
                    value={profileOldPassword}
                    onChange={(e) => setProfileOldPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none"
                    placeholder="Enter current password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    New Password <span className="text-slate-500">(leave blank to keep current)</span>
                  </label>
                  <input
                    type="password"
                    value={profilePassword}
                    onChange={(e) => setProfilePassword(e.target.value)}
                    minLength={6}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none"
                    placeholder="Min. 6 characters"
                  />
                </div>
                <div className="md:col-span-2 flex gap-3">
                  <button
                    type="submit"
                    disabled={profileSubmitting}
                    className="rounded-2xl border border-purple-400/30 bg-purple-400/10 px-6 py-2.5 font-medium text-purple-100 transition hover:bg-purple-400/20 disabled:opacity-50"
                  >
                    {profileSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowProfileEdit(false)}
                    className="rounded-2xl border border-white/10 bg-slate-950/50 px-6 py-2.5 font-medium text-slate-300 transition hover:bg-white/10"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* Profile Edit Button */}
          {!showProfileEdit && (
            <div className="flex justify-end">
              <button
                onClick={openProfileEdit}
                className="rounded-2xl border border-purple-400/30 bg-purple-400/10 px-4 py-2 text-sm font-medium text-purple-100 transition hover:bg-purple-400/20"
              >
                ✏️ Edit My Profile
              </button>
            </div>
          )}

          {/* Create User Form */}
          {showForm && (
            <section className="rounded-[28px] border border-cyan-400/20 bg-white/5 p-6 backdrop-blur">
              <h2 className="text-lg font-semibold text-white mb-4">Create New User</h2>
              <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Username <span className="text-slate-500">(letters, numbers, . and _ only)</span>
                  </label>
                  <input
                    type="text"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    required
                    minLength={3}
                    pattern="^[a-zA-Z0-9._]+$"
                    className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none"
                    placeholder="e.g. john.doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none"
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
                  <input
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none"
                    placeholder="Min. 6 characters"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Role</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as "ADMIN" | "INPUTTER" | "VIEWER")}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm focus:border-cyan-400/50 focus:outline-none"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="INPUTTER">Inputter (Data Entry)</option>
                    <option value="VIEWER">Viewer (Read Only)</option>
                  </select>
                </div>
                {formRole !== "ADMIN" && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-1">Branch</label>
                    <select
                      value={formBranchId}
                      onChange={(e) => setFormBranchId(e.target.value)}
                      required
                      className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-white text-sm focus:border-cyan-400/50 focus:outline-none"
                    >
                      <option value="">Select a branch</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-6 py-2.5 font-medium text-cyan-100 transition hover:bg-cyan-400/20 disabled:opacity-50"
                  >
                    {submitting ? "Creating..." : "Create User"}
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* Bulk Actions */}
          {selectedUserIds.size > 0 && (
            <div className="rounded-2xl border border-red-700/50 bg-red-900/20 p-4 flex items-center justify-between">
              <p className="text-sm text-red-300">
                {selectedUserIds.size} user(s) selected
              </p>
              <button
                onClick={handleBulkDelete}
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/20"
              >
                Delete Selected
              </button>
            </div>
          )}

          {/* Users List */}
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                All Users ({users.length})
              </h2>
              {users.length > 0 && (
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.size === users.length}
                    onChange={toggleSelectAll}
                    className="rounded border-white/20 bg-slate-950/50 text-cyan-400 focus:ring-cyan-400"
                  />
                  Select All
                </label>
              )}
            </div>
            {users.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400">No users yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className={`rounded-2xl border bg-slate-950/60 p-4 ${
                      selectedUserIds.has(u.id) ? 'border-cyan-400/50' : 'border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.has(u.id)}
                          onChange={() => toggleSelectUser(u.id)}
                          disabled={u.id === currentUser?.id}
                          className="rounded border-white/20 bg-slate-950/50 text-cyan-400 focus:ring-cyan-400 disabled:opacity-50"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-base font-semibold text-white">{u.name}</h3>
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${roleColors[u.role]}`}>
                              {u.role}
                            </span>
                            {u.email === 'admin@subcon.com' && (
                              <span className="inline-flex rounded-full border border-yellow-700/50 bg-yellow-900/30 px-2 py-0.5 text-[10px] font-semibold uppercase text-yellow-300">
                                Super Admin
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-400 mt-1">
                            <span className="text-cyan-300">@{u.username}</span> &middot; {u.email}
                          </p>
                          {u.branch && (
                            <p className="text-xs text-slate-500 mt-1">Branch: {u.branch.name}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Role selector */}
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="rounded-xl border border-white/10 bg-slate-950/50 px-2 py-1.5 text-xs text-white focus:border-cyan-400/50 focus:outline-none"
                        >
                          <option value="ADMIN">Admin</option>
                          <option value="INPUTTER">Inputter</option>
                          <option value="VIEWER">Viewer</option>
                        </select>

                        {/* Branch selector (for non-admin) */}
                        {u.role !== "ADMIN" && (
                          <select
                            value={u.branchId || ""}
                            onChange={(e) => handleBranchChange(u.id, e.target.value)}
                            className="rounded-xl border border-white/10 bg-slate-950/50 px-2 py-1.5 text-xs text-white focus:border-cyan-400/50 focus:outline-none"
                          >
                            <option value="">No branch</option>
                            {branches.map((b) => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                          </select>
                        )}

                        {/* Delete */}
                        {u.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="rounded-xl border border-red-500/20 bg-red-500/10 px-2 py-1.5 text-xs text-red-300 hover:bg-red-500/20"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}