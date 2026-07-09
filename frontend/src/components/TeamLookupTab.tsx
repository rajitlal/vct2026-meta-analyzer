import { useState, useEffect } from "react"
import { API } from "../api"

type TeamComp = {
  event: string
  date: string
  map_name: string
  opponent: string
  team_comp: string
  opponent_comp: string
  won: boolean
}

const EVENT_SHORT: Record<string, string> = {
  "VCT 2026: Americas Stage 1": "AM S1",
  "VCT 2026: EMEA Stage 1": "EMEA S1",
  "VCT 2026: Pacific Stage 1": "PAC S1",
  "VCT 2026: China Stage 1": "CN S1",
  "Valorant Masters London 2026": "Masters LDN",
}

export default function TeamLookupTab() {
  const [teams, setTeams] = useState<string[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string>("")
  const [data, setData] = useState<TeamComp[]>([])
  const [loading, setLoading] = useState(false)
  const [filterMap, setFilterMap] = useState<string>("All")
  const [filterEvent, setFilterEvent] = useState<string>("All")

  useEffect(() => {
    fetch(`${API}/teams`).then(r => r.json()).then((t: string[]) => {
      setTeams(t)
      if (t.length > 0) setSelectedTeam(t[0])
    })
  }, [])

  useEffect(() => {
    if (!selectedTeam) return
    setLoading(true)
    fetch(`${API}/team/comps?team=${encodeURIComponent(selectedTeam)}`)
      .then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [selectedTeam])

  const maps = ["All", ...Array.from(new Set(data.map(d => d.map_name))).sort()]
  const events = ["All", ...Array.from(new Set(data.map(d => d.event)))]
  const filtered = data.filter(row =>
    (filterMap === "All" || row.map_name === filterMap) &&
    (filterEvent === "All" || row.event === filterEvent)
  )
  const wins = filtered.filter(r => r.won).length
  const losses = filtered.filter(r => !r.won).length

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Team:</span>
          <select
            className="text-xs bg-gray-900 border border-gray-800 rounded-md px-2.5 py-1.5 text-gray-200 focus:outline-none"
            value={selectedTeam}
            onChange={e => { setSelectedTeam(e.target.value); setFilterMap("All"); setFilterEvent("All") }}
          >
            {teams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Event:</span>
          <select
            className="text-xs bg-gray-900 border border-gray-800 rounded-md px-2.5 py-1.5 text-gray-200 focus:outline-none"
            value={filterEvent}
            onChange={e => setFilterEvent(e.target.value)}
          >
            {events.map(e => <option key={e} value={e}>{EVENT_SHORT[e] ?? e}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Map:</span>
          <select
            className="text-xs bg-gray-900 border border-gray-800 rounded-md px-2.5 py-1.5 text-gray-200 focus:outline-none"
            value={filterMap}
            onChange={e => setFilterMap(e.target.value)}
          >
            {maps.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {selectedTeam && !loading && filtered.length > 0 && (
        <div className="flex gap-4 text-xs items-center">
          <span className="text-gray-500">{filtered.length} maps played</span>
          <span className="text-green-400 font-medium">{wins}W</span>
          <span className="text-red-400 font-medium">{losses}L</span>
          <span className="text-gray-500">{(wins / filtered.length * 100).toFixed(0)}% WR</span>
        </div>
      )}

      {loading && <div className="text-gray-500 text-xs">Loading...</div>}
      {!loading && filtered.length === 0 && <div className="text-gray-500 text-xs">No data for selected filters.</div>}

      {!loading && filtered.length > 0 && (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left py-2 pr-3 text-gray-500 font-medium">Date</th>
              <th className="text-left py-2 pr-3 text-gray-500 font-medium">Event</th>
              <th className="text-left py-2 pr-3 text-gray-500 font-medium">Map</th>
              <th className="text-left py-2 pr-3 text-gray-500 font-medium">Opponent</th>
              <th className="text-left py-2 pr-3 text-gray-500 font-medium">Their comp</th>
              <th className="text-left py-2 pr-3 text-gray-500 font-medium">Opp comp</th>
              <th className="text-right py-2 text-gray-500 font-medium">Result</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={i} className="border-b border-gray-800/40 hover:bg-gray-900/40">
                <td className="py-2 pr-3 text-gray-600">{row.date}</td>
                <td className="py-2 pr-3 text-gray-500">{EVENT_SHORT[row.event] ?? row.event}</td>
                <td className="py-2 pr-3 text-gray-200 font-medium">{row.map_name}</td>
                <td className="py-2 pr-3 text-gray-300">{row.opponent}</td>
                <td className="py-2 pr-3 font-mono text-gray-300">{row.team_comp}</td>
                <td className="py-2 pr-3 font-mono text-gray-600">{row.opponent_comp}</td>
                <td className={`py-2 text-right font-semibold ${row.won ? "text-green-400" : "text-red-400"}`}>
                  {row.won ? "W" : "L"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}