import { useState, useEffect, useCallback } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts"
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
    fetchAPI("presence/comp", filters, `agent=${selectedAgent}`).then(d => {
      if (Array.isArray(d)) setCompData(d)
      setCompLoading(false)
    }).catch(() => setCompLoading(false))
  }, [filters, selectedAgent])

  useEffect(() => { loadGlobal() }, [loadGlobal])
  useEffect(() => { if (view === "deep") loadComp() }, [view, loadComp])

  const allAgents = globalData.map(d => d.agent).sort()

  if (loading) return <div className="text-gray-500 text-sm">Loading...</div>
  if (error) return <div className="text-amber-500 text-sm">⚠ {error}</div>
  if (!globalData.length) return <div className="text-gray-500 text-sm">No data for selected filters.</div>

  return (
    <div className="space-y-5">
      <div className="bg-gray-900/50 border border-gray-800/50 rounded-lg px-4 py-3">
        <p className="text-xs text-gray-400 leading-relaxed">
          Win rate when your team <span className="text-white">has</span> an agent vs when you <span className="text-white">don't</span>. 
          Positive delta = agent helps. Negative = agent hurts or is picked into bad spots.
          <span className="text-gray-600 ml-2">Correlation, not causation.</span>
        </p>
      </div>

      <div className="flex gap-1.5">
        {(["overview", "deep"] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              view === v ? "bg-blue-600 text-white" : "bg-gray-900 text-gray-400 hover:text-gray-200 border border-gray-800"
            }`}
          >
            {v === "overview" ? "All agents" : "Per map deep dive"}
          </button>
        ))}
      </div>

      {view === "overview" && (
        <>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Win rate delta (with − without)</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={[...globalData].sort((a, b) => b.delta - a.delta)} margin={{ top: 4, right: 8, left: -10, bottom: 50 }}>
                <XAxis dataKey="agent" tick={{ fill: "#6b7280", fontSize: 11 }} angle={-40} textAnchor="end" interval={0} />
                <YAxis tickFormatter={v => `${(Number(v) * 100).toFixed(0)}%`} tick={{ fill: "#6b7280", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: 6, fontSize: 12 }}
                  formatter={((val: unknown) => [`${(Number(val) * 100).toFixed(1)}%`, "Delta"]) as any}
                />
                <ReferenceLine y={0} stroke="#374151" />
                <Bar dataKey="delta" radius={[3, 3, 0, 0]}
                  fill="#3b82f6"
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  label={false as any}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-2 pr-4 text-gray-500 font-medium">Agent</th>
                <th className="text-right py-2 pr-4 text-gray-500 font-medium">With WR</th>
                <th className="text-right py-2 pr-4 text-gray-500 font-medium">n</th>
                <th className="text-right py-2 pr-4 text-gray-500 font-medium">Without WR</th>
                <th className="text-right py-2 pr-4 text-gray-500 font-medium">n</th>
                <th className="text-right py-2 text-gray-500 font-medium">Delta</th>
              </tr>
            </thead>
            <tbody>
              {[...globalData].sort((a, b) => b.delta - a.delta).map(row => (
                <tr key={row.agent} className="border-b border-gray-800/40 hover:bg-gray-900/40">
                  <td className="py-2 pr-4 text-gray-200">{row.agent}</td>
                  <td className="py-2 pr-4 text-right text-gray-400">{(row.with_win_rate * 100).toFixed(1)}%</td>
                  <td className="py-2 pr-4 text-right text-gray-600">{row.with_picks}</td>
                  <td className="py-2 pr-4 text-right text-gray-400">{(row.without_win_rate * 100).toFixed(1)}%</td>
                  <td className="py-2 pr-4 text-right text-gray-600">{row.without_picks}</td>
                  <td className={`py-2 text-right font-medium ${
                    row.delta > 0.05 ? "text-green-400" : row.delta < -0.05 ? "text-red-400" : "text-gray-500"
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
            <span className="text-xs text-gray-500">Agent:</span>
            <select
              className="text-xs bg-gray-900 border border-gray-800 rounded-md px-2.5 py-1.5 text-gray-200 focus:outline-none"
              value={selectedAgent}
              onChange={e => setSelectedAgent(e.target.value)}
            >
              {allAgents.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <button onClick={loadComp} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-md text-xs text-white transition">
              Load
            </button>
          </div>

          {compLoading && <div className="text-gray-500 text-xs">Loading...</div>}

          {!compLoading && compData.length > 0 && (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={compData} margin={{ top: 4, right: 8, left: -10, bottom: 30 }}>
                  <XAxis dataKey="map_name" tick={{ fill: "#6b7280", fontSize: 11 }} angle={-20} textAnchor="end" />
                  <YAxis domain={[0, 1]} tickFormatter={v => `${(Number(v) * 100).toFixed(0)}%`} tick={{ fill: "#6b7280", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: 6, fontSize: 12 }}
                    formatter={((val: unknown) => [`${(Number(val) * 100).toFixed(1)}%`, "Win rate"]) as any}
                  />
                  <Legend wrapperStyle={{ color: "#9ca3af", fontSize: 11 }} />
                  <ReferenceLine y={0.5} stroke="#374151" strokeDasharray="3 3" />
                  <Bar dataKey="with_win_rate" name={`With ${selectedAgent}`} fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="without_win_rate" name={`Without ${selectedAgent}`} fill="#374151" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-2 pr-4 text-gray-500 font-medium">Map</th>
                    <th className="text-right py-2 pr-4 text-gray-500 font-medium">With WR</th>
                    <th className="text-right py-2 pr-4 text-gray-500 font-medium">n</th>
                    <th className="text-right py-2 pr-4 text-gray-500 font-medium">Without WR</th>
                    <th className="text-right py-2 pr-4 text-gray-500 font-medium">n</th>
                    <th className="text-right py-2 text-gray-500 font-medium">Delta</th>
                  </tr>
                </thead>
                <tbody>
                  {compData.map(row => (
                    <tr key={row.map_name} className="border-b border-gray-800/40 hover:bg-gray-900/40">
                      <td className="py-2 pr-4 text-gray-200">{row.map_name}</td>
                      <td className="py-2 pr-4 text-right text-gray-400">
                        {row.with_win_rate != null ? `${(row.with_win_rate * 100).toFixed(1)}%` : <span className="text-gray-700">—</span>}
                      </td>
                      <td className="py-2 pr-4 text-right text-gray-600">{row.with_picks}</td>
                      <td className="py-2 pr-4 text-right text-gray-400">
                        {row.without_win_rate != null ? `${(row.without_win_rate * 100).toFixed(1)}%` : <span className="text-gray-700">—</span>}
                      </td>
                      <td className="py-2 pr-4 text-right text-gray-600">{row.without_picks}</td>
                      <td className={`py-2 text-right font-medium ${
                        row.delta == null ? "text-gray-700" :
                        row.delta > 0.05 ? "text-green-400" :
                        row.delta < -0.05 ? "text-red-400" : "text-gray-500"
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