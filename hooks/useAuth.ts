"use client"

import { useState, useEffect } from "react"

interface User {
  id: string
  name: string
  email: string
  role: "ADMIN" | "INPUTTER" | "VIEWER"
  branchId: string | null
  branch: { id: string; name: string } | null
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/me")
        if (!res.ok) {
          window.location.href = "/login"
          return
        }
        const data = await res.json()
        setUser(data.user)
      } catch {
        setError("Failed to fetch user")
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [])

  return { user, loading, error }
}