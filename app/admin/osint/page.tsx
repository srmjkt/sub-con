"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/Sidebar";

type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type SourceType = "GITHUB_ORG" | "GITHUB_REPO" | "RSS_FEED" | "DOMAIN" | "IP_ADDRESS" | "USERNAME";

interface OsintSource {
  id: string;
  name: string;
  type: SourceType;
  target: string;
  isEnabled: boolean;
  lastCollectedAt: string | null;
  totalCollections: number;
  totalFindings: number;
}

interface OsintFinding {
  id: string;
  title: string;
  description: string;
  url: string;
  severity: Severity;
  confidence: number;
  category: string;
  tags: string[];
  sourceType: string;
  collectedAt: string;
  indicators: Array<{ type: string; value: string; context?: string }>;
  collection: {
    source: { name: string; type: string };
  };
}

interface OsintStats {
  totalSources: number;
  enabledSources: number;
  totalCollections: number;
  totalFindings: number;
  findingsBySeverity: Record<Severity, number>;
  findingsByCategory: Record<string, number>;
  recentFindings: OsintFinding[];
}

interface CollectionResult {
  sourceId: string;
  status: string;
  itemsFetched: number;
  itemsNew: number;
  error?: string;
}

const SEVERITY_COLORS: Record<Severity, { bg: string; text: string; border: string }> = {
  LOW: { bg: "bg-gray-900/30", text: "text-gray-400", border: "border-gray-700/50" },
  MEDIUM: { bg: "bg-yellow-900/30", text: "text-yellow-300", border: "border-yellow-700/50" },
  HIGH: { bg: "bg-orange-900/30", text: "text-orange-300", border: "border-orange-700/50" },
  CRITICAL: { bg: "bg-red-900/30", text: "text-red-300", border: "border-red-700/50" },
};

export default function OsintPage() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<OsintStats | null>(null);
  const [sources, setSources] = useState<OsintSource[]>([]);
  const [findings, setFindings] = useState<OsintFinding[]>([]);
  const [collections, setCollections] = useState<CollectionResult[]>([]);
  const [collecting, setCollecting] = useState(false);
  const [sourceFormOpen, setSourceFormOpen] = useState(false);
  const [newSource, setNewSource] = useState({
    name: "",
    type: "GITHUB_ORG" as SourceType,
    target: "",
    isEnabled: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<Severity | "ALL">("ALL");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterSourceType, setFilterSourceType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const SEVERITY_OPTIONS: Severity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
  const SOURCE_TYPE_OPTIONS: SourceType[] = [
    "GITHUB_ORG",
    "GITHUB_REPO",
    "RSS_FEED",
    "DOMAIN",
    "IP_ADDRESS",
    "USERNAME",
  ];

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/osint?type=stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = await res.json();
      setStats(data.stats);
    } catch (err) {
      console.error("[OSINT] stats error:", err);
    }
  }, []);

  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch("/api/osint?type=sources");
      if (!res.ok) throw new Error("Failed to fetch sources");
      const data = await res.json();
      setSources(data.sources);
    } catch (err) {
      console.error("[OSINT] sources error:", err);
    }
  }, []);

  const fetchFindings = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        type: "findings",
        page: "1",
        limit: "50",
      });
      if (filterSeverity !== "ALL") params.set("severity", filterSeverity);
      if (filterCategory !== "ALL") params.set("category", filterCategory);
      if (filterSourceType !== "ALL") params.set("sourceType", filterSourceType);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/osint?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch findings");
      const data = await res.json();
      setFindings(data.findings);
    } catch (err) {
      console.error("[OSINT] findings error:", err);
    }
  }, [filterSeverity, filterCategory, filterSourceType, searchQuery]);

  useEffect(() => {
    if (!authLoading && user && user.role === "ADMIN") {
      fetchStats();
      fetchSources();
      fetchFindings();
    }
  }, [authLoading, user, fetchStats, fetchSources, fetchFindings]);

  useEffect(() => {
    fetchFindings();
  }, [fetchFindings]);

  const handleCollectAll = async () => {
    setCollecting(true);
    setError(null);
    try {
      const res = await fetch("/api/osint/collect?all=1", { method: "POST" });
      if (!res.ok) throw new Error("Collection failed");
      const data = await res.json();
      setCollections(data.results);
      setSuccess(`Collection complete: ${data.results.length} sources processed`);
      fetchStats();
      fetchSources();
      fetchFindings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Collection failed");
    } finally {
      setCollecting(false);
    }
  };

  const handleCollectSource = async (sourceId: string) => {
    setCollecting(true);
    try {
      const res = await fetch(`/api/osint/collect?sourceId=${sourceId}`, { method: "POST" });
      if (!res.ok) throw new Error("Collection failed");
      const data = await res.json();
      setSuccess(`Collected ${data.result.itemsNew} new findings from source`);
      fetchStats();
      fetchSources();
      fetchFindings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Collection failed");
    } finally {
      setCollecting(false);
    }
  };

  const handleToggleSource = async (id: string, isEnabled: boolean) => {
    try {
      const res = await fetch(`/api/osint/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled }),
      });
      if (!res.ok) throw new Error("Failed to toggle source");
      fetchSources();
      fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle source");
    }
  };

  const handleDeleteSource = async (id: string) => {
    if (!window.confirm("Delete this OSINT source and all its collections/findings?")) return;
    try {
      const res = await fetch(`/api/osint/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete source");
      setSuccess("Source deleted");
      fetchSources();
      fetchStats();
      fetchFindings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete source");
    }
  };

  const handleCreateSource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/osint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSource),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create source");
      }
      setSourceFormOpen(false);
      setNewSource({ name: "", type: "GITHUB_ORG", target: "", isEnabled: true });
      setSuccess("OSINT source created");
      fetchSources();
      fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create source");
    }
  };

  const severityLabel = (s: Severity) => {
    const labels: Record<Severity, string> = {
      LOW: "Low",
      MEDIUM: "Medium",
      HIGH: "High",
      CRITICAL: "Critical",
    };
    return labels[s];
  };

  if (authLoading) return null;
  if (!user || user.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-300 p-4">
        <div className="max-w-2xl mx-auto text-center py-20">
          <h1 className="text-2xl font-semibold text-white mb-4">OSINT Dashboard</h1>
          <p className="text-slate-400">Access restricted to administrators.</p>
        </div>
      </div>
    );
  }

  const filteredFindings = findings.filter((f) => {
    if (filterSeverity !== "ALL" && f.severity !== filterSeverity) return false;
    if (filterCategory !== "ALL" && f.category !== filterCategory) return false;
    if (filterSourceType !== "ALL" && f.sourceType !== filterSourceType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        f.title.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="flex h-screen bg-slate-950 text-slate-300 overflow-hidden">
      <Sidebar role="ADMIN" branchName={user.branch?.name ?? null} branchId={user.branchId ?? null} />

      <main className="flex-1 overflow-y-auto bg-slate-950/80 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">OSINT Dashboard</h1>
              <p className="text-slate-400 text-sm">
                Open Source Intelligence collection and analysis for security monitoring
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCollectAll}
                disabled={collecting}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm bg-cyan-600 hover:bg-cyan-500 text-white transition disabled:opacity-50"
              >
                {collecting ? "Collecting..." : "🔄 Collect All"}
              </button>
              <button
                onClick={() => setSourceFormOpen(true)}
                className="rounded-xl px-3 py-2.5 text-sm bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition"
              >
                + Add Source
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-200 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-cyan-200 text-sm">
              {success}
            </div>
          )}

          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-400">Total Sources</p>
                <p className="text-2xl font-bold text-white">{stats.totalSources}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-400">Enabled</p>
                <p className="text-2xl font-bold text-cyan-300">{stats.enabledSources}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-400">Collections</p>
                <p className="text-2xl font-bold text-white">{stats.totalCollections}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-400">Findings</p>
                <p className="text-2xl font-bold text-white">{stats.totalFindings}</p>
              </div>
            </div>
          )}

          {stats && (
            <div className="flex flex-wrap gap-3 mb-6">
              {SEVERITY_OPTIONS.map((sev) => {
                const count = stats.findingsBySeverity[sev] || 0;
                const color = SEVERITY_COLORS[sev];
                return (
                  <div key={sev} className={`rounded-xl px-3 py-1.5 ${color.bg} ${color.text} ${color.border} text-xs font-medium border`}>
                    {severityLabel(sev)}: {count}
                  </div>
                );
              })}
            </div>
          )}

          <section className="mb-6">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-4">
              <h2 className="text-lg font-semibold text-white">Configured Sources</h2>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Name</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Type</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Target</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Collections</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Findings</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Last Collected</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map((src) => (
                    <tr key={src.id} className="border-b border-white/10 hover:bg-white/5 transition">
                      <td className="px-4 py-3 text-sm text-white">{src.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{src.type}</td>
                      <td className="px-4 py-3 text-sm text-slate-300 truncate max-w-xs">{src.target}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          src.isEnabled
                            ? "bg-green-900/30 text-green-300 border border-green-700/50"
                            : "bg-slate-900/30 text-slate-400 border border-slate-700/50"
                        }`}>
                          {src.isEnabled ? "Enabled" : "Disabled"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">{src.totalCollections}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{src.totalFindings}</td>
                      <td className="px-4 py-3 text-sm text-slate-400">
                        {src.lastCollectedAt ? new Date(src.lastCollectedAt).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm flex gap-1">
                        <button
                          onClick={() => handleCollectSource(src.id)}
                          disabled={collecting}
                          className="px-2 py-1 rounded text-xs bg-cyan-900/30 text-cyan-300 hover:bg-cyan-900/50 transition disabled:opacity-50"
                        >
                          Collect
                        </button>
                        <button
                          onClick={() => handleToggleSource(src.id, !src.isEnabled)}
                          className="px-2 py-1 rounded text-xs bg-white/5 text-slate-300 hover:bg-white/10 transition"
                        >
                          {src.isEnabled ? "Disable" : "Enable"}
                        </button>
                        <button
                          onClick={() => handleDeleteSource(src.id)}
                          className="px-2 py-1 rounded text-xs bg-red-900/30 text-red-300 hover:bg-red-900/50 transition"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {sources.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-4 text-center text-slate-400 text-sm">
                        No sources configured. Add your first OSINT source below.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-4">
              <h2 className="text-lg font-semibold text-white">Recent Findings</h2>
              <div className="flex flex-wrap gap-2">
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value as Severity | "ALL")}
                  className="rounded-lg px-2 py-1.5 border border-white/10 bg-white/5 text-sm text-white focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="ALL">All Severities</option>
                  {SEVERITY_OPTIONS.map((s) => (
                    <option key={s} value={s}>{severityLabel(s)}</option>
                  ))}
                </select>
                <select
                  value={filterSourceType}
                  onChange={(e) => setFilterSourceType(e.target.value)}
                  className="rounded-lg px-2 py-1.5 border border-white/10 bg-white/5 text-sm text-white focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="ALL">All Sources</option>
                  {SOURCE_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Search findings…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-lg px-3 py-1.5 border border-white/10 bg-white/5 text-sm text-white focus:ring-2 focus:ring-cyan-500 w-48"
                />
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Severity</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Title</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Category</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Source</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Type</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Collected</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase">Indicators</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFindings.map((f) => {
                    const color = SEVERITY_COLORS[f.severity as Severity] || SEVERITY_COLORS.LOW;
                    return (
                      <tr key={f.id} className="border-b border-white/10 hover:bg-white/5 transition">
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${color.bg} ${color.text} ${color.border} border`}>
                            {severityLabel(f.severity as Severity)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-white truncate max-w-xs" title={f.title}>
                          {f.title}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300 capitalize truncate">{f.category}</td>
                        <td className="px-4 py-3 text-sm text-slate-300 truncate">{f.collection.source.name}</td>
                        <td className="px-4 py-3 text-sm text-slate-400 text-xs">{f.sourceType}</td>
                        <td className="px-4 py-3 text-sm text-slate-400">
                          {new Date(f.collectedAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex flex-wrap gap-1">
                            {f.indicators.slice(0, 3).map((ind, i) => (
                              <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700/50">
                                {ind.value}
                              </span>
                            ))}
                            {f.indicators.length > 3 && (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-500 border border-slate-700/50">
                                +{f.indicators.length - 3} more
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredFindings.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-4 text-center text-slate-400 text-sm">
                        No findings collected yet. Add a source and run collection.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {sourceFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSourceFormOpen(false)}
          />
          <div className="relative bg-white/10 border border-white/20 rounded-2xl p-6 w-full max-w-md text-slate-300">
            <h2 className="text-lg font-bold text-white mb-4">Add OSINT Source</h2>
            <form onSubmit={handleCreateSource} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Source Name</label>
                <input
                  type="text"
                  value={newSource.name}
                  onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                  placeholder="e.g. MyOrg GitHub, Kompas RSS, example.com"
                  className="w-full rounded-lg px-3 py-2 border border-white/10 bg-white/5 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Source Type</label>
                <select
                  value={newSource.type}
                  onChange={(e) => setNewSource({ ...newSource, type: e.target.value as SourceType })}
                  className="w-full rounded-lg px-3 py-2 border border-white/10 bg-white/5 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                >
                  {SOURCE_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Target</label>
                <input
                  type="text"
                  value={newSource.target}
                  onChange={(e) => setNewSource({ ...newSource, target: e.target.value })}
                  placeholder="org-name, owner/repo, https://feed.rss, domain.com"
                  className="w-full rounded-lg px-3 py-2 border border-white/10 bg-white/5 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">Passive collection only — public APIs and RSS feeds.</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newSource.isEnabled}
                  onChange={(e) => setNewSource({ ...newSource, isEnabled: e.target.checked })}
                  className="rounded bg-white/5 border-white/10 text-cyan-600 focus:ring-cyan-500"
                />
                <label className="text-sm text-slate-300">Enabled</label>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 rounded-xl px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition"
                >
                  Create Source
                </button>
                <button
                  type="button"
                  onClick={() => setSourceFormOpen(false)}
                  className="flex-1 rounded-xl px-4 py-2.5 bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}