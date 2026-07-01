import { useState, useEffect } from "react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { API } from "../api"

type MetaShiftData = {
  events: string[]
  data: Record<string, Record<string, number>>
}

const AGENT_COLORS: Record<string, string> = {
  Neon: "#facc15", Omen: "#8b5cf6", Viper: "#22c55e", Fade: "#f97316",
  Sova: "#3b82f6", Skye: "#84cc16", Cypher: "#94a3b8", Raze: "#ef4444",
  Astra: "#a855f7", Phoenix: "#fb923c", Waylay: "#06b6d4", Jett: "#e2e8f0",
  Vyse: "#ec4899", Brimstone: "#f59e0b", Chamber: "#64748b", Killjoy: "#eab308",
  Harbor: "#0ea5e9", Kayo: "#10b981", Tejo: "#f43f5e", Sage: "#34d399",
  Breach: "#c084fc", Deadlock: "#6b7280", Yoru: "#818cf8", Iso: "#fb7185",
  Clove: "#d946ef", Gekko: "#a3e635", Reyna: "#f472b6", Miks: "#38bdf8",
  Veto: "#fbbf24",
}

const EVENT_SHORT: Record<string, string> = {
  "VCT 2026: Americas Stage 1": "AM S1",
  "VCT 2026: EMEA Stage 1": "EMEA S1",
  "VCT 2026: Pacific Stage 1": "PAC S1",
  "VCT 2026: China Stage 1": "CN S1",
  "Valorant Masters London 2026": "Masters LDN",
}

export default function MetaShiftTab() {
  const [data, setData] = useState<MetaShiftData | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set(["Neon", "Omen", "Viper", "Fade", "Sova"]))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/meta/shift`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading || !data) return <div className="text-gray-400 text-sm">Loading...</div>

  const allAgents = data.events.length > 0
    ? Object.keys(data.data[data.events[0]]).sort()
    : []

  // Build chart data — one row per event
  const chartData = data.events.map(event => {
    const row: Record<string, string | number> = { event: EVENT_SHORT[event] ?? event }
    for (const agent of allAgents) {
      row[agent] = data.data[event][agent] ?? 0
    }
    return row
  })

  const toggleAgent = (agent: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(agent)) next.delete(agent)
      else next.add(agent)
      return next
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-1">Meta Shift — Pick Rate % by Event</h2>
        <p className="text-gray-500 text-xs">Select agents below to compare. Pick rate = % of all agent slots filled by that agent.</p>
      </div>

      {/* Agent toggles */}
      <div className="flex flex-wrap gap-2">
        {allAgents.map(agent => (
          <button
            key={agent}
            onClick={() => toggleAgent(agent)}
            className={`px-2 py-1 rounded text-xs font-medium transition border ${
              selected.has(agent)
                ? "border-transparent text-gray-900"
                : "border-gray-700 text-gray-500 bg-transparent"
            }`}
            style={selected.has(agent) ? { backgroundColor: AGENT_COLORS[agent] ?? "#6b7280" } : {}}
          >
            {agent}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={380}>
        <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 8 }}>
          <XAxis dataKey="event" tick={{ fill: "#9ca3af", fontSize: 12 }} />
          <YAxis
            tickFormatter={v => `${v}%`}
            tick={{ fill: "#9ca3af", fontSize: 12 }}
            domain={[0, "auto"]}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 6 }}
            formatter={((val: unknown) => [`${Number(val).toFixed(1)}%`, "Pick Rate"]
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ) as any}
          />
          <Legend wrapperStyle={{ color: "#9ca3af", fontSize: 11 }} />
          {allAgents.filter(a => selected.has(a)).map(agent => (
            <Line
              key={agent}
              type="monotone"
              dataKey={agent}
              stroke={AGENT_COLORS[agent] ?? "#6b7280"}
              strokeWidth={2}
              dot={{ r: 4, fill: AGENT_COLORS[agent] ?? "#6b7280" }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Raw table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left py-2 pr-4 text-gray-400 font-medium">Agent</th>
              {data.events.map(e => (
                <th key={e} className="text-right py-2 pr-4 text-gray-400 font-medium">{EVENT_SHORT[e] ?? e}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allAgents
              .filter(a => selected.has(a))
              .map(agent => (
                <tr key={agent} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-2 pr-4 font-medium" style={{ color: AGENT_COLORS[agent] ?? "#e2e8f0" }}>
                    {agent}
                  </td>
                  {data.events.map(e => (
                    <td key={e} className="py-2 pr-4 text-right text-gray-300">
                      {data.data[e][agent]?.toFixed(1) ?? "0.0"}%
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