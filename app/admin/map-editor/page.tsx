"use client"

import { useAuth } from "@/hooks/useAuth"
import { Sidebar } from "@/components/Sidebar"
import { useState, useRef, useCallback, useEffect } from "react"

interface ProvinceDot {
  name: string
  province: string
  x: number
  y: number
}

// Initial province positions (default coordinates)
const DEFAULT_PROVINCE_CAPITALS: ProvinceDot[] = [
  { name: "Banda Aceh", province: "Aceh", x: 8, y: 5 },
  { name: "Medan", province: "Sumatera Utara", x: 12, y: 14 },
  { name: "Padang", province: "Sumatera Barat", x: 8, y: 26 },
  { name: "Pekanbaru", province: "Riau", x: 18, y: 18 },
  { name: "Tanjung Pinang", province: "Kepulauan Riau", x: 26, y: 20 },
  { name: "Jambi", province: "Jambi", x: 18, y: 30 },
  { name: "Palembang", province: "Sumatera Selatan", x: 22, y: 38 },
  { name: "Bengkulu", province: "Bengkulu", x: 14, y: 36 },
  { name: "Bandar Lampung", province: "Lampung", x: 22, y: 46 },
  { name: "Pangkal Pinang", province: "Kepulauan Bangka Belitung", x: 26, y: 32 },
  { name: "Serang", province: "Banten", x: 30, y: 42 },
  { name: "Jakarta", province: "DKI Jakarta", x: 34, y: 44 },
  { name: "Bandung", province: "Jawa Barat", x: 36, y: 46 },
  { name: "Semarang", province: "Jawa Tengah", x: 42, y: 45 },
  { name: "Yogyakarta", province: "Daerah Istimewa Yogyakarta", x: 40, y: 49 },
  { name: "Surabaya", province: "Jawa Timur", x: 50, y: 45 },
  { name: "Pontianak", province: "Kalimantan Barat", x: 34, y: 20 },
  { name: "Palangka Raya", province: "Kalimantan Tengah", x: 44, y: 28 },
  { name: "Banjarmasin", province: "Kalimantan Selatan", x: 46, y: 36 },
  { name: "Samarinda", province: "Kalimantan Timur", x: 54, y: 22 },
  { name: "Tanjung Selor", province: "Kalimantan Utara", x: 54, y: 14 },
  { name: "Manado", province: "Sulawesi Utara", x: 62, y: 8 },
  { name: "Gorontalo", province: "Gorontalo", x: 64, y: 14 },
  { name: "Palu", province: "Sulawesi Tengah", x: 58, y: 22 },
  { name: "Mamuju", province: "Sulawesi Barat", x: 56, y: 30 },
  { name: "Makassar", province: "Sulawesi Selatan", x: 60, y: 38 },
  { name: "Kendari", province: "Sulawesi Tenggara", x: 66, y: 34 },
  { name: "Denpasar", province: "Bali", x: 54, y: 50 },
  { name: "Mataram", province: "Nusa Tenggara Barat", x: 56, y: 54 },
  { name: "Kupang", province: "Nusa Tenggara Timur", x: 66, y: 56 },
  { name: "Ambon", province: "Maluku", x: 74, y: 32 },
  { name: "Sofifi", province: "Maluku Utara", x: 72, y: 20 },
  { name: "Jayapura", province: "Papua", x: 86, y: 26 },
  { name: "Manokwari", province: "Papua Barat", x: 78, y: 18 },
  { name: "Merauke", province: "Papua Selatan", x: 88, y: 38 },
  { name: "Nabire", province: "Papua Tengah", x: 82, y: 30 },
  { name: "Wamena", province: "Papua Pegunungan", x: 86, y: 32 },
  { name: "Sorong", province: "Papua Barat Daya", x: 76, y: 24 },
]

export default function MapEditorPage() {
  const { user, loading } = useAuth()
  const [dots, setDots] = useState<ProvinceDot[]>(DEFAULT_PROVINCE_CAPITALS)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [mapImageError, setMapImageError] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const dragOffset = useRef({ x: 0, y: 0 })
  
  // Zoom and pan state (viewBox based)
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 100, h: 75 })
  const zoomLevel = 100 / viewBox.w
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })
  const panStartVB = useRef({ x: 0, y: 0 })

  // Load saved positions from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("provinceDotPositions")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length === DEFAULT_PROVINCE_CAPITALS.length) {
          setDots(parsed)
        }
      } catch {}
    }
  }, [])

  // Convert screen coords to viewBox coords
  const screenToViewBox = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const vb = viewBox
    return {
      x: vb.x + ((clientX - rect.left) / rect.width) * vb.w,
      y: vb.y + ((clientY - rect.top) / rect.height) * vb.h,
    }
  }, [viewBox])

  // Handle drag start on a dot
  const handleDragStart = useCallback((index: number, clientX: number, clientY: number) => {
    setDraggingIndex(index)
    setSelectedIndex(index)
    const dot = dots[index]
    const pos = screenToViewBox(clientX, clientY)
    dragOffset.current = { x: dot.x - pos.x, y: dot.y - pos.y }
  }, [dots, screenToViewBox])

  // Handle mouse/touch move during drag
  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (draggingIndex === null) return
    const pos = screenToViewBox(clientX, clientY)
    setDots(prev => {
      const updated = [...prev]
      updated[draggingIndex] = {
        ...updated[draggingIndex],
        x: Math.round(Math.max(0, Math.min(100, pos.x + dragOffset.current.x)) * 10) / 10,
        y: Math.round(Math.max(0, Math.min(75, pos.y + dragOffset.current.y)) * 10) / 10,
      }
      return updated
    })
  }, [draggingIndex, screenToViewBox])

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggingIndex(null)
  }, [])

  // Mouse event handlers for dots
  const handleMouseDown = useCallback((e: React.MouseEvent, index: number) => {
    e.preventDefault()
    e.stopPropagation()
    handleDragStart(index, e.clientX, e.clientY)
  }, [handleDragStart])

  useEffect(() => {
    if (draggingIndex === null) return
    const handleMouseMove = (e: MouseEvent) => handleDragMove(e.clientX, e.clientY)
    const handleMouseUp = () => handleDragEnd()
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggingIndex, handleDragMove, handleDragEnd])

  // Touch event handlers for dots
  const handleTouchStart = useCallback((e: React.TouchEvent, index: number) => {
    e.stopPropagation()
    const touch = e.touches[0]
    handleDragStart(index, touch.clientX, touch.clientY)
  }, [handleDragStart])

  useEffect(() => {
    if (draggingIndex === null) return
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      const touch = e.touches[0]
      handleDragMove(touch.clientX, touch.clientY)
    }
    const handleTouchEnd = () => handleDragEnd()
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd)
    return () => {
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [draggingIndex, handleDragMove, handleDragEnd])

  // Pan the map (middle mouse or ctrl+drag)
  const handleMapMouseDown = useCallback((e: React.MouseEvent) => {
    if (draggingIndex !== null) return
    if (e.button === 1 || e.ctrlKey || e.metaKey) {
      e.preventDefault()
      isPanning.current = true
      panStart.current = { x: e.clientX, y: e.clientY }
      panStartVB.current = { x: viewBox.x, y: viewBox.y }
    }
  }, [draggingIndex, viewBox])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanning.current) return
      const svg = svgRef.current
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      const vb = viewBox
      const dx = ((e.clientX - panStart.current.x) / rect.width) * vb.w
      const dy = ((e.clientY - panStart.current.y) / rect.height) * vb.h
      setViewBox(prev => ({
        ...prev,
        x: panStartVB.current.x - dx,
        y: panStartVB.current.y - dy,
      }))
    }
    const handleMouseUp = () => { isPanning.current = false }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [viewBox])

  // Wheel zoom - zoom towards cursor
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const vb = viewBox

    // Mouse position in viewBox coords
    const mx = vb.x + ((e.clientX - rect.left) / rect.width) * vb.w
    const my = vb.y + ((e.clientY - rect.top) / rect.height) * vb.h

    const delta = e.deltaY > 0 ? 1.15 : 1 / 1.15
    const newW = Math.max(10, Math.min(200, vb.w * delta))
    const newH = newW * 0.75
    const ratio = newW / vb.w

    setViewBox({
      x: mx - (mx - vb.x) * ratio,
      y: my - (my - vb.y) * ratio,
      w: newW,
      h: newH,
    })
  }, [viewBox])

  // Zoom controls
  const zoomIn = useCallback(() => {
    setViewBox(prev => {
      const newW = Math.max(10, prev.w / 1.3)
      const newH = newW * 0.75
      const cx = prev.x + prev.w / 2
      const cy = prev.y + prev.h / 2
      return { x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH }
    })
  }, [])

  const zoomOut = useCallback(() => {
    setViewBox(prev => {
      const newW = Math.min(200, prev.w * 1.3)
      const newH = newW * 0.75
      const cx = prev.x + prev.w / 2
      const cy = prev.y + prev.h / 2
      return { x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH }
    })
  }, [])

  const resetView = useCallback(() => {
    setViewBox({ x: 0, y: 0, w: 100, h: 75 })
  }, [])

  // Save to localStorage and copy to clipboard
  const handleSave = useCallback(() => {
    localStorage.setItem("provinceDotPositions", JSON.stringify(dots))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [dots])

  // Copy as JS array for page.tsx
  const handleCopyCode = useCallback(() => {
    const code = `const PROVINCE_CAPITALS = [\n${dots.map(d => `  { name: "${d.name}", province: "${d.province}", x: ${d.x}, y: ${d.y} }`).join(",\n")}\n]`
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [dots])

  // Reset dots to default
  const handleReset = useCallback(() => {
    setDots(DEFAULT_PROVINCE_CAPITALS)
    localStorage.removeItem("provinceDotPositions")
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (!user || user.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white">Access denied. Admin only.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <Sidebar role="ADMIN" />
      <div className="lg:ml-64 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Map Editor</h1>
              <p className="text-sm text-slate-400 mt-1">
                Drag dots to reposition them. Use scroll wheel or zoom buttons to zoom in for precise placement. Ctrl+drag or middle-mouse to pan.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-400/20"
              >
                Reset to Default
              </button>
              <button
                onClick={handleCopyCode}
                className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/20"
              >
                {copied ? "Copied!" : "Copy as Code"}
              </button>
              <button
                onClick={handleSave}
                className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-400/20"
              >
                {saved ? "Saved!" : "Save Positions"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Map Editor Panel */}
            <div className="lg:col-span-2 rounded-[28px] border border-white/10 bg-slate-900/60 p-4 lg:p-6 backdrop-blur">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-slate-400">
                  {draggingIndex !== null ? (
                    <span className="text-cyan-300">Dragging: <strong>{dots[draggingIndex].province} ({dots[draggingIndex].name})</strong> — x: {dots[draggingIndex].x}, y: {dots[draggingIndex].y}</span>
                  ) : selectedIndex !== null ? (
                    <span>Selected: <strong>{dots[selectedIndex].province} ({dots[selectedIndex].name})</strong> — x: {dots[selectedIndex].x}, y: {dots[selectedIndex].y}</span>
                  ) : (
                    <span>Click or drag a dot to reposition it</span>
                  )}
                </div>
                {/* Zoom Controls */}
                <div className="flex items-center gap-1 bg-slate-800 rounded-lg border border-white/10 p-0.5">
                  <button
                    onClick={zoomOut}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-slate-300 hover:bg-slate-700 hover:text-white transition text-sm font-bold"
                    title="Zoom out"
                  >
                    −
                  </button>
                  <button
                    onClick={resetView}
                    className="px-2 text-[11px] text-slate-400 hover:text-white transition font-mono"
                    title="Reset zoom"
                  >
                    {Math.round(zoomLevel * 100)}%
                  </button>
                  <button
                    onClick={zoomIn}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-slate-300 hover:bg-slate-700 hover:text-white transition text-sm font-bold"
                    title="Zoom in"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="relative w-full bg-slate-950 rounded-xl overflow-hidden" style={{ paddingBottom: "75%" }}>
                <svg
                  ref={svgRef}
                  viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
                  className="absolute inset-0 w-full h-full"
                  xmlns="http://www.w3.org/2000/svg"
                  onWheel={handleWheel}
                  onMouseDown={handleMapMouseDown}
                  style={{ cursor: isPanning.current ? 'grabbing' : draggingIndex !== null ? 'grabbing' : 'default' }}
                >
                  {/* Background map image - embedded in SVG so it zooms with everything */}
                  {!mapImageError ? (
                    <image
                      href="/indonesia-map.png"
                      x="0"
                      y="0"
                      width="100"
                      height="75"
                      preserveAspectRatio="xMidYMid meet"
                      onError={() => setMapImageError(true)}
                    />
                  ) : (
                    <rect x="0" y="0" width="100" height="75" fill="#0f172a" rx="2" />
                  )}
                  
                  {dots.map((dot, index) => {
                    const isDragging = draggingIndex === index
                    const isSelected = selectedIndex === index
                    const dotRadius = isDragging ? 3 : isSelected ? 2.5 : 1.8

                    return (
                      <g key={dot.province}>
                        {/* Glow effect for selected */}
                        {isSelected && (
                          <circle
                            cx={dot.x}
                            cy={dot.y}
                            r={5}
                            fill="none"
                            stroke="#22d3ee"
                            strokeWidth="0.3"
                            opacity="0.5"
                          >
                            <animate attributeName="r" values="3;6;3" dur="2s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2s" repeatCount="indefinite" />
                          </circle>
                        )}
                        {/* Dot */}
                        <circle
                          cx={dot.x}
                          cy={dot.y}
                          r={dotRadius}
                          fill="#dc2626"
                          stroke={isDragging ? "#67e8f9" : isSelected ? "#fca5a5" : "#7f1d1d"}
                          strokeWidth="0.4"
                          style={{ cursor: "grab" }}
                          onMouseDown={(e) => handleMouseDown(e, index)}
                          onTouchStart={(e) => handleTouchStart(e, index)}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedIndex(index === selectedIndex ? null : index)
                          }}
                        />
                        {/* Label */}
                        <text
                          x={dot.x}
                          y={dot.y - 3}
                          textAnchor="middle"
                          fill="#94a3b8"
                          fontSize="1.3"
                          className="pointer-events-none select-none"
                        >
                          {dot.name}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>
            </div>

            {/* Coordinates Panel */}
            <div className="rounded-[28px] border border-white/10 bg-slate-900/60 p-4 lg:p-6 backdrop-blur">
              <h2 className="text-lg font-semibold text-white mb-4">Coordinates</h2>
              <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-thin">
                {dots.map((dot, index) => (
                  <div
                    key={dot.province}
                    onClick={() => setSelectedIndex(index === selectedIndex ? null : index)}
                    className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg cursor-pointer transition ${
                      selectedIndex === index
                        ? "bg-cyan-900/30 text-cyan-200 border border-cyan-700/30"
                        : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                      <span className="font-medium">{dot.province}</span>
                      <span className="text-slate-500">({dot.name})</span>
                    </div>
                    <span className="text-slate-500">
                      x:{dot.x} y:{dot.y}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}