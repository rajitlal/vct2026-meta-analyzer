import { useState, useEffect, useCallback } from "react"
import { fetchAPI, type Filters } from "../api"

type AgentStat = {
  agent: string
  picks: number
  wins: number
  win_rate: number
  pick_rate: number
}

function WinBadge({ rate, picks }: { rate: number; picks: number }) {
  if (picks < 5) return <span className="text-xs text-gray-600 italic">low n</span>
  const pct = (rate * 100).toFixed(1)
  if (rate > 0.53) return <span className="text-green-400 font-medium text-xs">{pct}%</span>
  if (rate < 0.47) return <span className="text-red-400 font-medium text-xs">{pct}%</span>
  return <span className="text-gray-400 text-xs">{pct}%</span>
}

export default function AgentsTab({ filters }: { filters: Filters }) {
  const [data, setData] = useState<AgentStat[]>([])
  const [sortBy, setSortBy] = useState<"picks" | "win_rate" | "pick_rate">("picks")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(null)
    fetchAPI("agents", filters, "min_picks=1").then(d => {
      if (Array.isArray(d)) { setData(d); setLoading(false) }
      else { setError(d?.detail || "No data"); setLoading(false) }
    }).catch(() => { setError("Failed to load"); setLoading(false) })
  }, [filters])

  useEffect(() => { load() }, [load])

  const sorted = [...data].sort((a, b) => b[sortBy] - a[sortBy])
  const top = sorted[0]
  const topWr = [...data].filter(d => d.picks >= 10).sort((a, b) => b.win_rate - a.win_rate)[0]

  if (loading) return <div className="text-gray-500 text-sm">Loading...</div>
  if (error) return <div className="text-amber-500 text-sm">⚠ {error}</div>

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Most picked", value: top?.agent ?? "—", sub: `${top?.pick_rate}% of slots` },
          { label: "Highest win rate", value: topWr?.agent ?? "—", sub: `${(topWr?.win_rate * 100).toFixed(1)}% · ${topWr?.picks} picks` },
          { label: "Agents tracked", value: data.length.toString(), sub: "min 1 appearance" },
          { label: "Total agent slots", value: (data.reduce((s, d) => s + d.picks, 0)).toLocaleString(), sub: "across all games" },
        ].map(card => (
          <div key={card.label} className="bg-gray-900 rounded-lg p-4 border border-gray-800/50">
            <div className="text-xs text-gray-500 mb-1.5">{card.label}</div>
            <div className="text-xl font-semibold text-white">{card.value}</div>
            <div className="text-xs text-gray-600 mt-0.5">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Sort controls */}
      <div className="flex gap-1.5">
        {(["picks", "pick_rate", "win_rate"] as const).map(s => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              sortBy === s
                ? "bg-blue-600 text-white"
                : "bg-gray-900 text-gray-400 hover:text-gray-200 border border-gray-800"
            }`}
          >
            {s === "picks" ? "Total picks" : s === "pick_rate" ? "Pick rate" : "Win rate"}
          </button>
        ))}
      </div>

      {/* Bar chart */}
      <div className="space-y-2">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">
          {sortBy === "picks" ? "Picks" : sortBy === "pick_rate" ? "Pick rate %" : "Win rate %"} by agent
        </div>
        {sorted.slice(0, 15).map(row => {
          const max = sorted[0][sortBy]
          const val = row[sortBy]
          const pct = (val / max) * 100
          const barColor = sortBy === "win_rate"
            ? row.win_rate > 0.53 ? "bg-green-500" : row.win_rate < 0.47 ? "bg-red-500" : "bg-gray-600"
            : "bg-blue-500"
          return (
            <div key={row.agent} className="flex items-center gap-3">
              <span className="text-xs text-gray-300 w-20 text-right">{row.agent}</span>
              <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-gray-500 w-12">
                {sortBy === "win_rate" ? `${(val * 100).toFixed(1)}%` : sortBy === "pick_rate" ? `${val}%` : val}
              </span>
            </div>
          )
        })}
      </div>

      {/* Table */}
      <div>
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">All agents</div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left py-2 pr-4 text-gray-500 font-medium">Agent</th>
              <th className="text-right py-2 pr-4 text-gray-500 font-medium">Picks</th>
              <th className="text-right py-2 pr-4 text-gray-500 font-medium">Pick rate</th>
              <th className="text-right py-2 text-gray-500 font-medium">Win rate</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(row => (
              <tr key={row.agent} className="border-b border-gray-800/40 hover:bg-gray-900/50 transition">
                <td className="py-2 pr-4 text-gray-200">{row.agent}</td>
                <td className="py-2 pr-4 text-right text-gray-400">{row.picks}</td>
                <td className="py-2 pr-4 text-right text-gray-400">{row.pick_rate}%</td>
                <td className="py-2 text-right"><WinBadge rate={row.win_rate} picks={row.picks} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}