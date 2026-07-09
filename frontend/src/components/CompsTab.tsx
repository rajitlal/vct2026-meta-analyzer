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
        const maps = Object.keys(d)
        setExpandedMap(maps.length === 1 ? maps[0] : null)
      } else {
        setError(d?.detail || "No data")
      }
      setLoading(false)
    }).catch(() => { setError("Failed to load"); setLoading(false) })
  }, [filters])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="text-gray-500 text-sm">Loading...</div>
  if (error) return <div className="text-amber-500 text-sm">⚠ {error}</div>
  if (!Object.keys(data).length) return <div className="text-gray-500 text-sm">No comps meet the minimum sample size.</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">Min 3 appearances · click a map to expand</p>
        <div className="flex gap-1.5">
          {(["win_rate", "appearances"] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                sortBy === s ? "bg-blue-600 text-white" : "bg-gray-900 text-gray-400 hover:text-gray-200 border border-gray-800"
              }`}
            >
              {s === "win_rate" ? "Win rate" : "Most played"}
            </button>
          ))}
        </div>
      </div>

      {Object.entries(data).map(([mapName, comps]) => {
        const sorted = [...comps].sort((a, b) => b[sortBy] - a[sortBy])
        const isExpanded = expandedMap === mapName
        const best = sorted[0]

        return (
          <div key={mapName} className="border border-gray-800/60 rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedMap(isExpanded ? null : mapName)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-900/60 hover:bg-gray-900 transition text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-white">{mapName}</span>
                <span className="text-xs text-gray-500">{comps.length} comps</span>
                {!isExpanded && best && (
                  <span className="text-xs text-gray-600">best: <span className="text-gray-400">{(best.win_rate * 100).toFixed(0)}% WR</span></span>
                )}
              </div>
              <span className="text-gray-600 text-xs">{isExpanded ? "▲" : "▼"}</span>
            </button>

            {isExpanded && (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800/60 border-t">
                    <th className="text-left py-2 px-4 text-gray-500 font-medium">Comp</th>
                    <th className="text-right py-2 px-4 text-gray-500 font-medium">Played</th>
                    <th className="text-right py-2 px-4 text-gray-500 font-medium">Win rate</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row, i) => (
                    <tr key={i} className="border-b border-gray-800/30 hover:bg-gray-900/40">
                      <td className="py-2.5 px-4 font-mono text-gray-300">{row.team_comp}</td>
                      <td className="py-2.5 px-4 text-right text-gray-500">{row.appearances}</td>
                      <td className={`py-2.5 px-4 text-right font-medium ${
                        row.win_rate > 0.6 ? "text-green-400" :
                        row.win_rate < 0.4 ? "text-red-400" : "text-gray-400"
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