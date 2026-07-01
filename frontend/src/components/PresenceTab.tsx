import { useState, useEffect, useCallback } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell, Legend } from "recharts"
import { fetchAPI, type Filters } from "../api"

type PresenceStat = {
  agent: string
  with_picks: number
  with_win_rate: number
  without_picks: number
  without_win_rate: number
  delta: number
}

type CompPresenceStat = {
  map_name: string
  agent: string
  with_picks: number
  with_win_rate: number | null
  without_picks: number
  without_win_rate: number | null
  delta: number | null
}

export default function PresenceTab({ filters }: { filters: Filters }) {
  const [globalData, setGlobalData] = useState<PresenceStat[]>([])
  const [compData, setCompData] = useState<CompPresenceStat[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string>("Breach")
  const [loading, setLoading] = useState(true)
  const [compLoading, setCompLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<"overview" | "deep">("overview")

  const loadGlobal = useCallback(() => {
    setError(null)
    fetchAPI("agents/presence", filters, "min_picks=3").then(d => {
      if (Array.isArray(d)) { setGlobalData(d); setLoading(false) }
      else { setError(d?.detail || "No data"); setLoading(false) }
    }).catch(() => { setError("Failed to load"); setLoading(false) })
  }, [filters])

  const loadComp = useCallback(() => {
    if (!selectedAgent) return
    setCompLoading(true)
    fetchAPI(`presence/comp`, filters, `agent=${selectedAgent}`).then(d => {
      if (Array.isArray(d)) setCompData(d)
      setCompLoading(false)
    }).catch(() => setCompLoading(false))
  }, [filters, selectedAgent])

  useEffect(() => { loadGlobal() }, [loadGlobal])
  useEffect(() => { if (view === "deep") loadComp() }, [view, loadComp])

  const allAgents = globalData.map(d => d.agent).sort()

  if (loading) return <div className="text-gray-400 text-sm">Loading...</div>
  if (error) return <div className="text-yellow-400 text-sm">⚠ {error}</div>
  if (!globalData.length) return <div className="text-gray-400 text-sm">No data for selected filters.</div>

  return (
    <div className="space-y-6">
      <div>
        <p className="text-gray-400 text-sm mb-1">
          <span className="text-white font-medium">Agent Presence</span> — win rate when your team has an agent vs when you don't. Positive delta = agent helps. Negative = agent hurts (or is picked into bad situations).
        </p>
        <p className="text-gray-500 text-xs">Note: causation ≠ correlation. Low-sample agents flagged.</p>
      </div>

      {/* View toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setView("overview")}
          className={`px-3 py-1.5 rounded text-sm font-medium transition ${view === "overview" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
        >
          All Agents Overview
        </button>
        <button
          onClick={() => setView("deep")}
          className={`px-3 py-1.5 rounded text-sm font-medium transition ${view === "deep" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
        >
          Deep Dive Per Map
        </button>
      </div>

      {view === "overview" && (
        <>
          {/* Delta chart */}
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Win Rate Delta (with − without agent)
            </h2>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={[...globalData].sort((a, b) => b.delta - a.delta)}
                margin={{ top: 4, right: 16, left: 0, bottom: 60 }}
              >
                <XAxis dataKey="agent" tick={{ fill: "#9ca3af", fontSize: 12 }} angle={-45} textAnchor="end" interval={0} />
                <YAxis tickFormatter={v => `${(Number(v) * 100).toFixed(0)}%`} tick={{ fill: "#9ca3af", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 6 }}
                  formatter={((val: unknown) => [`${(Number(val) * 100).toFixed(1)}%`, "Delta"]
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ) as any}
                />
                <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="4 4" />
                <Bar dataKey="delta" radius={[4, 4, 0, 0]}>
                  {[...globalData].sort((a, b) => b.delta - a.delta).map(entry => (
                    <Cell key={entry.agent} fill={entry.delta > 0 ? "#22c55e" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-2 pr-4 text-gray-400 font-medium">Agent</th>
                <th className="text-right py-2 pr-4 text-gray-400 font-medium">With WR</th>
                <th className="text-right py-2 pr-4 text-gray-400 font-medium">With n</th>
                <th className="text-right py-2 pr-4 text-gray-400 font-medium">Without WR</th>
                <th className="text-right py-2 pr-4 text-gray-400 font-medium">Without n</th>
                <th className="text-right py-2 text-gray-400 font-medium">Delta</th>
              </tr>
            </thead>
            <tbody>
              {[...globalData].sort((a, b) => b.delta - a.delta).map(row => (
                <tr key={row.agent} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-2 pr-4 font-medium text-white">{row.agent}</td>
                  <td className="py-2 pr-4 text-right text-gray-300">{(row.with_win_rate * 100).toFixed(1)}%</td>
                  <td className="py-2 pr-4 text-right text-gray-500 text-xs">{row.with_picks}</td>
                  <td className="py-2 pr-4 text-right text-gray-300">{(row.without_win_rate * 100).toFixed(1)}%</td>
                  <td className="py-2 pr-4 text-right text-gray-500 text-xs">{row.without_picks}</td>
                  <td className={`py-2 text-right font-semibold ${
                    row.delta > 0.05 ? "text-green-400" :
                    row.delta < -0.05 ? "text-red-400" : "text-gray-300"
                  }`}>
                    {row.delta > 0 ? "+" : ""}{(row.delta * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {view === "deep" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm">Agent:</span>
            <select
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none"
              value={selectedAgent}
              onChange={e => { setSelectedAgent(e.target.value) }}
            >
              {allAgents.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <button
              onClick={loadComp}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white transition"
            >
              Load
            </button>
          </div>

          {compLoading && <div className="text-gray-400 text-sm">Loading...</div>}

          {!compLoading && compData.length > 0 && (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={compData} margin={{ top: 4, right: 16, left: 0, bottom: 40 }}>
                  <XAxis dataKey="map_name" tick={{ fill: "#9ca3af", fontSize: 12 }} angle={-30} textAnchor="end" />
                  <YAxis domain={[0, 1]} tickFormatter={v => `${(Number(v) * 100).toFixed(0)}%`} tick={{ fill: "#9ca3af", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 6 }}
                    formatter={((val: unknown) => [`${(Number(val) * 100).toFixed(1)}%`, "Win Rate"]
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ) as any}
                  />
                  <Legend wrapperStyle={{ color: "#9ca3af", fontSize: 12 }} />
                  <ReferenceLine y={0.5} stroke="#6b7280" strokeDasharray="4 4" />
                  <Bar dataKey="with_win_rate" name={`With ${selectedAgent}`} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="without_win_rate" name={`Without ${selectedAgent}`} fill="#6b7280" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-2 pr-4 text-gray-400 font-medium">Map</th>
                    <th className="text-right py-2 pr-4 text-gray-400 font-medium">With WR</th>
                    <th className="text-right py-2 pr-4 text-gray-400 font-medium">n</th>
                    <th className="text-right py-2 pr-4 text-gray-400 font-medium">Without WR</th>
                    <th className="text-right py-2 pr-4 text-gray-400 font-medium">n</th>
                    <th className="text-right py-2 text-gray-400 font-medium">Delta</th>
                  </tr>
                </thead>
                <tbody>
                  {compData.map(row => (
                    <tr key={row.map_name} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-2 pr-4 font-medium text-white">{row.map_name}</td>
                      <td className="py-2 pr-4 text-right text-gray-300">
                        {row.with_win_rate != null ? `${(row.with_win_rate * 100).toFixed(1)}%` : <span className="text-gray-600 text-xs">low n</span>}
                      </td>
                      <td className="py-2 pr-4 text-right text-gray-500 text-xs">{row.with_picks}</td>
                      <td className="py-2 pr-4 text-right text-gray-300">
                        {row.without_win_rate != null ? `${(row.without_win_rate * 100).toFixed(1)}%` : <span className="text-gray-600 text-xs">low n</span>}
                      </td>
                      <td className="py-2 pr-4 text-right text-gray-500 text-xs">{row.without_picks}</td>
                      <td className={`py-2 text-right font-semibold ${
                        row.delta == null ? "text-gray-600" :
                        row.delta > 0.05 ? "text-green-400" :
                        row.delta < -0.05 ? "text-red-400" : "text-gray-300"
                      }`}>
                        {row.delta != null ? `${row.delta > 0 ? "+" : ""}${(row.delta * 100).toFixed(1)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  )
}