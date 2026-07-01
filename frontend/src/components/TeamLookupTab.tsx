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

export default function TeamLookupTab() {
  const [teams, setTeams] = useState<string[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string>("")
  const [data, setData] = useState<TeamComp[]>([])
  const [loading, setLoading] = useState(false)
  const [filterMap, setFilterMap] = useState<string>("All")
  const [filterEvent, setFilterEvent] = useState<string>("All")

  useEffect(() => {
    fetch(`${API}/teams`)
      .then(r => r.json())
      .then((t: string[]) => {
        setTeams(t)
        if (t.length > 0) setSelectedTeam(t[0])
      })
  }, [])

  useEffect(() => {
    if (!selectedTeam) return
    setLoading(true)
    fetch(`${API}/team/comps?team=${encodeURIComponent(selectedTeam)}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
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
          <span className="text-gray-400 text-sm">Team:</span>
          <select
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none"
            value={selectedTeam}
            onChange={e => { setSelectedTeam(e.target.value); setFilterMap("All"); setFilterEvent("All") }}
          >
            {teams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">Event:</span>
          <select
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none"
            value={filterEvent}
            onChange={e => setFilterEvent(e.target.value)}
          >
            {events.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">Map:</span>
          <select
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none"
            value={filterMap}
            onChange={e => setFilterMap(e.target.value)}
          >
            {maps.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {selectedTeam && !loading && (
        <div className="flex gap-4 text-sm">
          <span className="text-gray-400">{filtered.length} maps</span>
          <span className="text-green-400">{wins}W</span>
          <span className="text-red-400">{losses}L</span>
          {filtered.length > 0 && (
            <span className="text-gray-400">{(wins / filtered.length * 100).toFixed(0)}% WR</span>
          )}
        </div>
      )}

      {loading && <div className="text-gray-400 text-sm">Loading...</div>}

      {!loading && filtered.length === 0 && (
        <div className="text-gray-400 text-sm">No data for selected filters.</div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-2 pr-3 text-gray-400 font-medium">Date</th>
                <th className="text-left py-2 pr-3 text-gray-400 font-medium">Event</th>
                <th className="text-left py-2 pr-3 text-gray-400 font-medium">Map</th>
                <th className="text-left py-2 pr-3 text-gray-400 font-medium">Opponent</th>
                <th className="text-left py-2 pr-3 text-gray-400 font-medium">Their Comp</th>
                <th className="text-left py-2 pr-3 text-gray-400 font-medium">Opp Comp</th>
                <th className="text-right py-2 text-gray-400 font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-2 pr-3 text-gray-500 text-xs">{row.date}</td>
                  <td className="py-2 pr-3 text-gray-400 text-xs">{row.event.replace("VCT 2026: ", "").replace("Valorant Masters London 2026", "Masters LDN")}</td>
                  <td className="py-2 pr-3 text-white font-medium">{row.map_name}</td>
                  <td className="py-2 pr-3 text-gray-300">{row.opponent}</td>
                  <td className="py-2 pr-3 font-mono text-xs text-gray-200">{row.team_comp}</td>
                  <td className="py-2 pr-3 font-mono text-xs text-gray-500">{row.opponent_comp}</td>
                  <td className={`py-2 text-right font-semibold ${row.won ? "text-green-400" : "text-red-400"}`}>
                    {row.won ? "W" : "L"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}