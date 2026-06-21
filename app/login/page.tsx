"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showForgotForm, setShowForgotForm] = useState(false)
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotMessage, setForgotMessage] = useState("")
  const [forgotLoading, setForgotLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Login failed")
        setLoading(false)
        return
      }

      // Redirect based on role
      const role = data.user.role
      if (role === "ADMIN") {
        router.push("/admin")
      } else if (role === "INPUTTER") {
        router.push("/inputter")
      } else if (role === "VIEWER") {
        router.push("/viewer")
      } else {
        router.push("/dashboard")
      }
    } catch {
      setError("An error occurred. Please try again.")
      setLoading(false)
    }
  }

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault()
    setForgotMessage("")
    setForgotLoading(true)

    try {
      const res = await fetch("/api/auth/forgot-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      })

      const data = await res.json()

      if (!res.ok) {
        setForgotMessage(data.error || "Failed to submit request")
        setForgotLoading(false)
        return
      }

      setForgotMessage("Your request has been submitted. An administrator will review it and contact you at the provided email.")
      setForgotEmail("")
    } catch {
      setForgotMessage("An error occurred. Please try again.")
    }
    setForgotLoading(false)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Home Button */}
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Back to Home
          </Link>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-sky-950/30 backdrop-blur">
          {!showForgotForm ? (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200 mb-4">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400"></span>
                  </span>
                  Secure Access
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-white">
                  Security Risk Management System
                </h1>
                <p className="mt-2 text-sm text-slate-400">
                  Sign in to access your dashboard
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="rounded-2xl border border-red-700/50 bg-red-900/30 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-slate-300 mb-2"
                  >
                    Email or Username
                  </label>
                  <input
                    id="email"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 transition"
                    placeholder="admin or admin@subcon.com"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-slate-300 mb-2"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 transition"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 font-medium text-cyan-100 transition hover:bg-cyan-400/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setShowForgotForm(true)}
                  className="text-sm text-slate-400 hover:text-cyan-300 transition underline underline-offset-2"
                >
                  Forgot your email or password?
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-amber-200 mb-4">
                  Need Help?
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-white">
                  Forgot Credentials
                </h1>
                <p className="mt-2 text-sm text-slate-400">
                  Submit your email and an admin will assist you
                </p>
              </div>

              <form onSubmit={handleForgotSubmit} className="space-y-5">
                {forgotMessage && (
                  <div className={`rounded-2xl border px-4 py-3 text-sm ${
                    forgotMessage.includes("submitted")
                      ? "border-emerald-700/50 bg-emerald-900/30 text-emerald-300"
                      : "border-red-700/50 bg-red-900/30 text-red-300"
                  }`}>
                    {forgotMessage}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="forgotEmail"
                    className="block text-sm font-medium text-slate-300 mb-2"
                  >
                    Your Email Address
                  </label>
                  <input
                    id="forgotEmail"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-400/50 focus:outline-none focus:ring-1 focus:ring-amber-400/50 transition"
                    placeholder="you@example.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 font-medium text-amber-100 transition hover:bg-amber-400/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {forgotLoading ? "Submitting..." : "Submit Request"}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotForm(false)
                    setForgotMessage("")
                  }}
                  className="text-sm text-slate-400 hover:text-cyan-300 transition underline underline-offset-2"
                >
                  Back to Sign in
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}