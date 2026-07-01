import { useState, useEffect } from "react"
import { API, type Filters } from "./api"
import AgentsTab from "./components/AgentsTab"
import CompsTab from "./components/CompsTab"
import PresenceTab from "./components/PresenceTab"
import CounterTab from "./components/CounterTab"
import MetaShiftTab from "./components/MetaShiftTab"
import SynergyTab from "./components/SynergyTab"
import MapPoolTab from "./components/MapPoolTab"
import TeamLookupTab from "./components/TeamLookupTab"
import PredictTab from "./components/PredictTab"

export default function App() {
  const [tab, setTab] = useState("agents")
  const [filters, setFilters] = useState<Filters>({ event: "All", map: "All", region: "All" })
  const [filterOptions, setFilterOptions] = useState<{ events: string[], maps: string[], regions: string[] }>({
    events: ["All"], maps: ["All"], regions: ["All"]
  })
  const [filterError, setFilterError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API}/filters`).then(r => r.json()).then(setFilterOptions)
  }, [])

  useEffect(() => {
    const { event, region } = filters
    if (
      event !== "All" &&
      event !== "Valorant Masters London 2026" &&
      region !== "All" &&
      region !== "International" &&
      !event.toLowerCase().includes(region.toLowerCase())
    ) {
      setFilterError(`"${region}" teams don't play in ${event} — data will be empty.`)
    } else {
      setFilterError(null)
    }
  }, [filters])

  const tabs = [
    { id: "agents", label: "Agent Stats" },
    { id: "comps", label: "Comp Win Rates" },
    { id: "presence", label: "Agent Presence" },
    { id: "counter", label: "Counter Picks" },
    { id: "meta", label: "Meta Shift" },
    { id: "synergy", label: "Synergy" },
    { id: "mappool", label: "Map Pool" },
    { id: "teams", label: "Team Lookup" },
    { id: "predict", label: "🤖 Win Predictor" },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="border-b border-gray-800 px-6 py-4">
        <h1 className="text-xl font-bold text-white tracking-tight">VCT 2026 Meta Analyzer</h1>
        <p className="text-gray-400 text-sm mt-0.5">Stage 1 + Masters London · 1,014 map games · 29 agents</p>
      </div>

      <div className="border-b border-gray-800 px-6 py-3 flex gap-4 flex-wrap items-center">
        {([["event", "Event"], ["map", "Map"], ["region", "Region"]] as const).map(([key, label]) => (
          <div key={key} className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">{label}</span>
            <select
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-gray-500"
              value={filters[key]}
              onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}
            >
              {(key === "event" ? filterOptions.events : key === "map" ? filterOptions.maps : filterOptions.regions).map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        ))}
        <button
          onClick={() => setFilters({ event: "All", map: "All", region: "All" })}
          className="text-sm text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-800 transition"
        >
          Reset
        </button>
        {filterError && (
          <span className="text-yellow-400 text-xs ml-2">⚠ {filterError}</span>
        )}
      </div>

      <div className="border-b border-gray-800 px-6 flex gap-1 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition ${
              tab === t.id
                ? "border-blue-500 text-white"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {tab === "agents" && <AgentsTab filters={filters} />}
        {tab === "comps" && <CompsTab filters={filters} />}
        {tab === "presence" && <PresenceTab filters={filters} />}
        {tab === "counter" && <CounterTab filters={filters} />}
        {tab === "meta" && <MetaShiftTab />}
        {tab === "synergy" && <SynergyTab filters={filters} />}
        {tab === "mappool" && <MapPoolTab />}
        {tab === "teams" && <TeamLookupTab />}
        {tab === "predict" && <PredictTab />}
      </div>
    </div>
  )
}