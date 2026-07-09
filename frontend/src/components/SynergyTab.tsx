import { useState, useEffect, useCallback } from "react"
import { fetchAPI, type Filters } from "../api"

type SynergyPair = {
  agent_a: string
  agent_b: string
  together: number
  win_rate: number
}

export default function SynergyTab({ filters }: { filters: Filters }) {
  const [data, setData] = useState<SynergyPair[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<"win_rate" | "together">("win_rate")
  const [filterAgent, setFilterAgent] = useState<string>("All")
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(null)
    fetchAPI("synergy", filters, "min_together=3").then(d => {
      if (Array.isArray(d)) { setData(d); setLoading(false) }
      else { setError(d?.detail || "No data"); setLoading(false) }
    }).catch(() => { setError("Failed to load"); setLoading(false) })
  }, [filters])

  useEffect(() => { load() }, [load])

  const allAgents = ["All", ...Array.from(new Set(data.flatMap(d => [d.agent_a, d.agent_b]))).sort()]
  const filtered = data
    .filter(d => filterAgent === "All" || d.agent_a === filterAgent || d.agent_b === filterAgent)
    .sort((a, b) => b[sortBy] - a[sortBy])

  if (loading) return <div className="text-gray-500 text-sm">Loading...</div>
  if (error) return <div className="text-amber-500 text-sm">⚠ {error}</div>
  if (!data.length) return <div className="text-gray-500 text-sm">No synergy data for selected filters.</div>

  return (
    <div className="space-y-4">
      <div className="bg-gray-900/50 border border-gray-800/50 rounded-lg px-4 py-3">
        <p className="text-xs text-gray-400">How often agent pairs appear together and their win rate. Min 3 games together. Filter by agent to see all their pairings.</p>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Agent:</span>
          <select
            className="text-xs bg-gray-900 border border-gray-800 rounded-md px-2.5 py-1.5 text-gray-200 focus:outline-none"
            value={filterAgent}
            onChange={e => setFilterAgent(e.target.value)}
          >
            {allAgents.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="flex gap-1.5">
          {(["win_rate", "together"] as const).map(s => (
            <button key={s} onClick={() => setSortBy(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                sortBy === s ? "bg-blue-600 text-white" : "bg-gray-900 text-gray-400 hover:text-gray-200 border border-gray-800"
              }`}
            >
              {s === "win_rate" ? "Win rate" : "Most together"}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-600">{filtered.length} pairs</span>
      </div>

      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left py-2 pr-4 text-gray-500 font-medium">Agent A</th>
            <th className="text-left py-2 pr-4 text-gray-500 font-medium">Agent B</th>
            <th className="text-right py-2 pr-4 text-gray-500 font-medium">Games together</th>
            <th className="text-right py-2 text-gray-500 font-medium">Win rate</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((row, i) => (
            <tr key={i} className="border-b border-gray-800/40 hover:bg-gray-900/40">
              <td className="py-2 pr-4 text-gray-200">{row.agent_a}</td>
              <td className="py-2 pr-4 text-gray-200">{row.agent_b}</td>
              <td className="py-2 pr-4 text-right text-gray-500">{row.together}</td>
              <td className={`py-2 text-right font-medium ${
                row.win_rate > 0.6 ? "text-green-400" : row.win_rate < 0.4 ? "text-red-400" : "text-gray-400"
              }`}>
                {(row.win_rate * 100).toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}