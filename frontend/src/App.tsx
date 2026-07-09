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
      setFilterError(`${region} teams don't play in this event`)
    } else {
      setFilterError(null)
    }
  }, [filters])

  const tabs = [
    { id: "agents", label: "Agent stats" },
    { id: "comps", label: "Comp win rates" },
    { id: "presence", label: "Agent presence" },
    { id: "counter", label: "Counter picks" },
    { id: "meta", label: "Meta shift" },
    { id: "synergy", label: "Synergy" },
    { id: "mappool", label: "Map pool" },
    { id: "teams", label: "Team lookup" },
    { id: "predict", label: "Win predictor" },
  ]

  const eventShort = (e: string) => e
    .replace("VCT 2026: ", "")
    .replace("Valorant Masters London 2026", "Masters London")

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-gray-800/60">
        <div className="flex items-baseline gap-3">
          <h1 className="text-lg font-semibold text-white tracking-tight">VCT 2026 meta analyzer</h1>
          <span className="text-gray-500 text-sm">Stage 1 + Masters London</span>
        </div>
        <div className="flex gap-4 mt-2 text-xs text-gray-600">
          <span>1,014 map games</span>
          <span>29 agents</span>
          <span>8 maps</span>
          <span>5 events</span>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-2.5 border-b border-gray-800/60 flex gap-5 items-center flex-wrap bg-gray-950/80">
        {([["event", "Event", filterOptions.events], ["map", "Map", filterOptions.maps], ["region", "Region", filterOptions.regions]] as const).map(([key, label, opts]) => (
          <div key={key} className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{label}</span>
            <select
              className="text-xs bg-gray-900 border border-gray-800 rounded-md px-2.5 py-1.5 text-gray-200 focus:outline-none focus:border-gray-600 cursor-pointer"
              value={filters[key as keyof Filters]}
              onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}
            >
              {(opts as string[]).map(opt => (
                <option key={opt} value={opt}>
                  {key === "event" ? eventShort(opt) : opt}
                </option>
              ))}
            </select>
          </div>
        ))}
        <button
          onClick={() => setFilters({ event: "All", map: "All", region: "All" })}
          className="text-xs text-gray-600 hover:text-gray-400 transition"
        >
          Reset
        </button>
        {filterError && (
          <span className="text-xs text-amber-500/80">⚠ {filterError}</span>
        )}
      </div>

      {/* Tabs */}
      <div className="px-6 border-b border-gray-800/60 flex gap-0 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3.5 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-all ${
              tab === t.id
                ? "border-blue-500 text-white"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-6 py-6 max-w-6xl">
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