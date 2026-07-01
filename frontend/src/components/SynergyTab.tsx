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

  if (loading) return <div className="text-gray-400 text-sm">Loading...</div>
  if (error) return <div className="text-yellow-400 text-sm">⚠ {error}</div>
  if (!data.length) return <div className="text-gray-400 text-sm">No synergy data for selected filters.</div>

  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-sm">
        How often agent pairs appear together and their combined win rate. Min 3 games together.
        <span className="text-gray-600 text-xs ml-2">Note: correlation, not causation — popular pairs appear more.</span>
      </p>

      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">Filter agent:</span>
          <select
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none"
            value={filterAgent}
            onChange={e => setFilterAgent(e.target.value)}
          >
            {allAgents.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          {(["win_rate", "together"] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                sortBy === s ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {s === "win_rate" ? "Win Rate" : "Most Together"}
            </button>
          ))}
        </div>
        <span className="text-gray-500 text-xs">{filtered.length} pairs</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left py-2 pr-4 text-gray-400 font-medium">Agent A</th>
              <th className="text-left py-2 pr-4 text-gray-400 font-medium">Agent B</th>
              <th className="text-right py-2 pr-4 text-gray-400 font-medium">Games Together</th>
              <th className="text-right py-2 text-gray-400 font-medium">Win Rate</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="py-2 pr-4 font-medium text-white">{row.agent_a}</td>
                <td className="py-2 pr-4 font-medium text-white">{row.agent_b}</td>
                <td className="py-2 pr-4 text-right text-gray-400">{row.together}</td>
                <td className={`py-2 text-right font-semibold ${
                  row.win_rate > 0.6 ? "text-green-400" :
                  row.win_rate < 0.4 ? "text-red-400" : "text-gray-300"
                }`}>
                  {(row.win_rate * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}