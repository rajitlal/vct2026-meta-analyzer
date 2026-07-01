import { useState, useEffect, useCallback } from "react"
import { fetchAPI, type Filters } from "../api"

type CompStat = {
  team_comp: string
  appearances: number
  wins: number
  win_rate: number
}

type CompsData = Record<string, CompStat[]>

export default function CompsTab({ filters }: { filters: Filters }) {
  const [data, setData] = useState<CompsData>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<"win_rate" | "appearances">("win_rate")
  const [expandedMap, setExpandedMap] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(null)
    fetchAPI("comps", filters, "min_appearances=3").then(d => {
      if (d && typeof d === "object" && !Array.isArray(d) && !d.detail) {
        setData(d)
        // Auto-expand first map
        const maps = Object.keys(d)
        if (maps.length === 1) setExpandedMap(maps[0])
        else setExpandedMap(null)
      } else {
        setError(d?.detail || "No data")
      }
      setLoading(false)
    }).catch(() => { setError("Failed to load"); setLoading(false) })
  }, [filters])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="text-gray-400 text-sm">Loading...</div>
  if (error) return <div className="text-yellow-400 text-sm">⚠ {error}</div>
  if (!Object.keys(data).length) return <div className="text-gray-400 text-sm">No comps meet the minimum sample size for selected filters.</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-sm">Min 3 appearances per comp · click a map to expand</p>
        <div className="flex gap-2">
          {(["win_rate", "appearances"] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                sortBy === s ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {s === "win_rate" ? "Win Rate" : "Most Played"}
            </button>
          ))}
        </div>
      </div>

      {Object.entries(data).map(([mapName, comps]) => {
        const sorted = [...comps].sort((a, b) => b[sortBy] - a[sortBy])
        const isExpanded = expandedMap === mapName

        return (
          <div key={mapName} className="border border-gray-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedMap(isExpanded ? null : mapName)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-900 hover:bg-gray-800 transition text-left"
            >
              <span className="font-semibold text-white">{mapName}</span>
              <div className="flex items-center gap-3">
                <span className="text-gray-400 text-sm">{comps.length} comps</span>
                <span className="text-gray-500 text-xs">{isExpanded ? "▲" : "▼"}</span>
              </div>
            </button>

            {isExpanded && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900/50">
                    <th className="text-left py-2 px-4 text-gray-400 font-medium">Comp</th>
                    <th className="text-right py-2 px-4 text-gray-400 font-medium">Played</th>
                    <th className="text-right py-2 px-4 text-gray-400 font-medium">Win Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row, i) => (
                    <tr key={i} className="border-b border-gray-800/40 hover:bg-gray-800/20">
                      <td className="py-2 px-4 font-mono text-xs text-gray-200">{row.team_comp}</td>
                      <td className="py-2 px-4 text-right text-gray-400">{row.appearances}</td>
                      <td className={`py-2 px-4 text-right font-semibold ${
                        row.win_rate > 0.6 ? "text-green-400" :
                        row.win_rate < 0.4 ? "text-red-400" : "text-gray-300"
                      }`}>
                        {(row.win_rate * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )
      })}
    </div>
  )
}