import { useState, useEffect, useCallback } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts"
import { fetchAPI, type Filters } from "../api"

type AgentStat = {
  agent: string
  picks: number
  wins: number
  win_rate: number
  pick_rate: number
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

  if (loading) return <div className="text-gray-400 text-sm">Loading...</div>
  if (error) return <div className="text-yellow-400 text-sm">⚠ {error}</div>
  if (!data.length) return <div className="text-gray-400 text-sm">No data for selected filters.</div>

  return (
    <div className="space-y-8">
      <div className="flex gap-2">
        {(["picks", "pick_rate", "win_rate"] as const).map(s => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition ${
              sortBy === s ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            {s === "picks" ? "Total Picks" : s === "pick_rate" ? "Pick Rate %" : "Win Rate %"}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={sorted} margin={{ top: 4, right: 16, left: 0, bottom: 60 }}>
          <XAxis dataKey="agent" tick={{ fill: "#9ca3af", fontSize: 12 }} angle={-45} textAnchor="end" interval={0} />
          <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
          <Tooltip
            contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 6 }}
            labelStyle={{ color: "#f9fafb" }}
            formatter={((val: unknown) => {
              const n = Number(val)
              if (sortBy === "win_rate") return [`${(n * 100).toFixed(1)}%`, "Win Rate"]
              if (sortBy === "pick_rate") return [`${n}%`, "Pick Rate"]
              return [n, "Picks"]
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            }) as any}
          />
          {sortBy === "win_rate" && <ReferenceLine y={0.5} stroke="#6b7280" strokeDasharray="4 4" />}
          <Bar dataKey={sortBy} radius={[4, 4, 0, 0]}>
            {sorted.map((entry) => (
              <Cell
                key={entry.agent}
                fill={
                  sortBy === "win_rate"
                    ? entry.win_rate > 0.52 ? "#22c55e" : entry.win_rate < 0.48 ? "#ef4444" : "#6b7280"
                    : "#3b82f6"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left py-2 pr-4 text-gray-400 font-medium">Agent</th>
            <th className="text-right py-2 pr-4 text-gray-400 font-medium">Picks</th>
            <th className="text-right py-2 pr-4 text-gray-400 font-medium">Pick Rate</th>
            <th className="text-right py-2 pr-4 text-gray-400 font-medium">Win Rate</th>
            <th className="text-right py-2 text-gray-400 font-medium">Sample</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(row => (
            <tr key={row.agent} className="border-b border-gray-800/50 hover:bg-gray-800/30">
              <td className="py-2 pr-4 font-medium text-white">{row.agent}</td>
              <td className="py-2 pr-4 text-right text-gray-300">{row.picks}</td>
              <td className="py-2 pr-4 text-right text-gray-300">{row.pick_rate}%</td>
              <td className={`py-2 pr-4 text-right font-medium ${
                row.picks < 5 ? "text-gray-500" :
                row.win_rate > 0.52 ? "text-green-400" :
                row.win_rate < 0.48 ? "text-red-400" : "text-gray-300"
              }`}>
                {(row.win_rate * 100).toFixed(1)}%
              </td>
              <td className="py-2 text-right">
                {row.picks < 5 && <span className="text-xs text-gray-600 italic">low n</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}