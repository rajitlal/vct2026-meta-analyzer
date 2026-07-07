import { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { API } from "../api"

type MapPoolData = Record<string, Record<string, number>>

const REGION_COLORS: Record<string, string> = {
  Americas: "#3b82f6",
  EMEA: "#f97316",
  Pacific: "#22c55e",
  China: "#ef4444",
}

export default function MapPoolTab() {
  const [data, setData] = useState<MapPoolData>({})
  const [view, setView] = useState<"by_region" | "by_map">("by_region")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/maps/region`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) return <div className="text-gray-400 text-sm">Loading...</div>
  if (!Object.keys(data).length) return <div className="text-gray-400 text-sm">No data.</div>

  const regions = Object.keys(data)
  const maps = Array.from(new Set(regions.flatMap(r => Object.keys(data[r])))).sort()

  // By region: one group per map, bars = regions
  const byMapChartData = maps.map(map => {
    const row: Record<string, string | number> = { map }
    for (const region of regions) {
      row[region] = data[region][map] ?? 0
    }
    return row
  })

  // By map: one group per region, bars = maps
  const byRegionChartData = regions.map(region => {
    const row: Record<string, string | number> = { region }
    for (const map of maps) {
      row[map] = data[region][map] ?? 0
    }
    return row
  })

  const MAP_COLORS: Record<string, string> = {
    Ascent: "#3b82f6", Bind: "#f97316", Breeze: "#06b6d4",
    Fracture: "#ef4444", Haven: "#22c55e", Lotus: "#a855f7",
    Pearl: "#ec4899", Split: "#f59e0b",
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-1">Regional Map Pool Preferences</h2>
        <p className="text-gray-500 text-xs">% of games played on each map per region. Stage 1 only (excludes Masters London).</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setView("by_region")}
          className={`px-3 py-1.5 rounded text-sm font-medium transition ${view === "by_region" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
        >
          By Region
        </button>
        <button
          onClick={() => setView("by_map")}
          className={`px-3 py-1.5 rounded text-sm font-medium transition ${view === "by_map" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
        >
          By Map
        </button>
      </div>

      {view === "by_map" && (
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={byMapChartData} margin={{ top: 4, right: 16, left: 0, bottom: 8 }}>
            <XAxis dataKey="map" tick={{ fill: "#9ca3af", fontSize: 12 }} />
            <YAxis tickFormatter={v => `${v}%`} tick={{ fill: "#9ca3af", fontSize: 12 }} />
            <Tooltip
              contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 6 }}
              formatter={((val: unknown) => [`${Number(val).toFixed(1)}%`, ""]
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ) as any}
            />
            <Legend wrapperStyle={{ color: "#9ca3af", fontSize: 12 }} />
            {regions.map(region => (
              <Bar key={region} dataKey={region} fill={REGION_COLORS[region]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}

      {view === "by_region" && (
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={byRegionChartData} margin={{ top: 4, right: 16, left: 0, bottom: 8 }}>
            <XAxis dataKey="region" tick={{ fill: "#9ca3af", fontSize: 12 }} />
            <YAxis tickFormatter={v => `${v}%`} tick={{ fill: "#9ca3af", fontSize: 12 }} />
            <Tooltip
              contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 6 }}
              formatter={((val: unknown) => [`${Number(val).toFixed(1)}%`, ""]
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ) as any}
            />
            <Legend wrapperStyle={{ color: "#9ca3af", fontSize: 12 }} />
            {maps.map(map => (
              <Bar key={map} dataKey={map} fill={MAP_COLORS[map] ?? "#6b7280"} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Raw table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left py-2 pr-4 text-gray-400 font-medium">Map</th>
              {regions.map(r => (
                <th key={r} className="text-right py-2 pr-4 font-medium" style={{ color: REGION_COLORS[r] }}>{r}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {maps.map(map => (
              <tr key={map} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="py-2 pr-4 font-medium text-white">{map}</td>
                {regions.map(r => (
                  <td key={r} className="py-2 pr-4 text-right text-gray-300">
                    {data[r][map] != null ? `${data[r][map]}%` : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}