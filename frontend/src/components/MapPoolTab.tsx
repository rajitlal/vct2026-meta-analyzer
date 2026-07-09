import { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { API } from "../api"

type MapPoolData = Record<string, Record<string, number>>

const REGION_COLORS: Record<string, string> = {
  Americas: "#3b82f6", EMEA: "#f97316", Pacific: "#22c55e", China: "#ef4444",
}

const MAP_COLORS: Record<string, string> = {
  Ascent: "#3b82f6", Bind: "#f97316", Breeze: "#06b6d4",
  Fracture: "#ef4444", Haven: "#22c55e", Lotus: "#a855f7",
  Pearl: "#ec4899", Split: "#f59e0b",
}

export default function MapPoolTab() {
  const [data, setData] = useState<MapPoolData>({})
  const [view, setView] = useState<"by_region" | "by_map">("by_map")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/maps/region`).then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) return <div className="text-gray-500 text-sm">Loading...</div>
  if (!Object.keys(data).length) return <div className="text-gray-500 text-sm">No data.</div>

  const regions = Object.keys(data)
  const maps = Array.from(new Set(regions.flatMap(r => Object.keys(data[r])))).sort()

  const byMapChartData = maps.map(map => {
    const row: Record<string, string | number> = { map }
    for (const region of regions) row[region] = data[region][map] ?? 0
    return row
  })

  const byRegionChartData = regions.map(region => {
    const row: Record<string, string | number> = { region }
    for (const map of maps) row[map] = data[region][map] ?? 0
    return row
  })

  return (
    <div className="space-y-5">
      <div className="bg-gray-900/50 border border-gray-800/50 rounded-lg px-4 py-3">
        <p className="text-xs text-gray-400">% of games played on each map per region. Stage 1 only — excludes Masters London since all regions play there.</p>
      </div>

      <div className="flex gap-1.5">
        {(["by_map", "by_region"] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              view === v ? "bg-blue-600 text-white" : "bg-gray-900 text-gray-400 hover:text-gray-200 border border-gray-800"
            }`}
          >
            {v === "by_map" ? "Compare regions per map" : "Compare maps per region"}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={view === "by_map" ? byMapChartData : byRegionChartData}
          margin={{ top: 4, right: 8, left: -10, bottom: 8 }}
        >
          <XAxis dataKey={view === "by_map" ? "map" : "region"} tick={{ fill: "#6b7280", fontSize: 11 }} />
          <YAxis tickFormatter={v => `${v}%`} tick={{ fill: "#6b7280", fontSize: 11 }} />
          <Tooltip
            contentStyle={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: 6, fontSize: 12 }}
            formatter={((val: unknown) => [`${Number(val).toFixed(1)}%`, ""]) as any}
          />
          <Legend wrapperStyle={{ color: "#9ca3af", fontSize: 11 }} />
          {view === "by_map"
            ? regions.map(r => <Bar key={r} dataKey={r} fill={REGION_COLORS[r]} radius={[3, 3, 0, 0]} />)
            : maps.map(m => <Bar key={m} dataKey={m} fill={MAP_COLORS[m] ?? "#6b7280"} radius={[3, 3, 0, 0]} />)
          }
        </BarChart>
      </ResponsiveContainer>

      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left py-2 pr-4 text-gray-500 font-medium">Map</th>
            {regions.map(r => (
              <th key={r} className="text-right py-2 pr-4 font-medium" style={{ color: REGION_COLORS[r] }}>{r}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {maps.map(map => (
            <tr key={map} className="border-b border-gray-800/40 hover:bg-gray-900/40">
              <td className="py-2 pr-4 text-gray-200">{map}</td>
              {regions.map(r => (
                <td key={r} className="py-2 pr-4 text-right text-gray-400">
                  {data[r][map] != null ? `${data[r][map]}%` : "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}