import { useState, useEffect, useCallback } from "react"
import { fetchAPI, type Filters } from "../api"

type CounterStat = {
  opp_agent: string
  my_agent: string
  appearances: number
  wins: number
  win_rate: number
}

export default function CounterTab({ filters }: { filters: Filters }) {
  const [data, setData] = useState<CounterStat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOpp, setSelectedOpp] = useState<string>("All")

  const load = useCallback(() => {
    setError(null)
    fetchAPI("counter", filters, "min_appearances=5").then(d => {
      if (Array.isArray(d)) { setData(d); setLoading(false) }
      else { setError(d?.detail || "No data"); setLoading(false) }
    }).catch(() => { setError("Failed to load"); setLoading(false) })
  }, [filters])

  useEffect(() => { load() }, [load])

  const oppAgents = ["All", ...Array.from(new Set(data.map(d => d.opp_agent))).sort()]
  const filtered = selectedOpp === "All" ? data : data.filter(d => d.opp_agent === selectedOpp)

  if (loading) return <div className="text-gray-500 text-sm">Loading...</div>
  if (error) return <div className="text-amber-500 text-sm">⚠ {error}</div>
  if (!data.length) return <div className="text-gray-500 text-sm">No data for selected filters.</div>

  return (
    <div className="space-y-4">
      <div className="bg-gray-900/50 border border-gray-800/50 rounded-lg px-4 py-3">
        <p className="text-xs text-gray-400">Given your opponent runs a specific agent, which agents on your team win most often against them. Min 5 appearances.</p>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500">Opponent runs:</span>
        <select
          className="text-xs bg-gray-900 border border-gray-800 rounded-md px-2.5 py-1.5 text-gray-200 focus:outline-none"
          value={selectedOpp}
          onChange={e => setSelectedOpp(e.target.value)}
        >
          {oppAgents.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <span className="text-xs text-gray-600">→ what beats it?</span>
      </div>

      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left py-2 pr-4 text-gray-500 font-medium">Opponent</th>
            <th className="text-left py-2 pr-4 text-gray-500 font-medium">Your pick</th>
            <th className="text-right py-2 pr-4 text-gray-500 font-medium">Sample</th>
            <th className="text-right py-2 text-gray-500 font-medium">Win rate</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((row, i) => (
            <tr key={i} className="border-b border-gray-800/40 hover:bg-gray-900/40">
              <td className="py-2 pr-4 text-gray-400">{row.opp_agent}</td>
              <td className="py-2 pr-4 text-gray-200">{row.my_agent}</td>
              <td className="py-2 pr-4 text-right text-gray-600">{row.appearances}</td>
              <td className={`py-2 text-right font-medium ${
                row.win_rate > 0.6 ? "text-green-400" :
                row.win_rate < 0.4 ? "text-red-400" : "text-gray-400"
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