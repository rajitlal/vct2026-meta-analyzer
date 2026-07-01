import { useState, useEffect } from "react"
import { API } from "../api"

type PredictResult = {
  agents: string[]
  map: string
  win_probability: number
  win_probability_pct: number
  model_cv_accuracy: number
  note: string
  feature_contributions: {
    feature: string
    coefficient: number
    direction: string
  }[]
}

type ModelInfo = {
  cv_accuracy: number
  agents: string[]
  maps: string[]
  n_features: number
  model_type: string
}

const AGENT_ROLES: Record<string, string> = {
  // Duelists
  Jett: "Duelist", Neon: "Duelist", Raze: "Duelist", Phoenix: "Duelist",
  Reyna: "Duelist", Yoru: "Duelist", Iso: "Duelist", Waylay: "Duelist",
  // Controllers
  Omen: "Controller", Brimstone: "Controller", Astra: "Controller",
  Viper: "Controller", Harbor: "Controller", Clove: "Controller",
  // Sentinels
  Cypher: "Sentinel", Killjoy: "Sentinel", Sage: "Sentinel",
  Deadlock: "Sentinel", Chamber: "Sentinel", Vyse: "Sentinel",
  // Initiators
  Sova: "Initiator", Fade: "Initiator", Breach: "Initiator", Skye: "Initiator",
  Kayo: "Initiator", Gekko: "Initiator", Tejo: "Initiator",
  // New/Unknown
  Miks: "Initiator", Veto: "Duelist",
}

const ROLE_COLORS: Record<string, string> = {
  Duelist: "text-red-400 bg-red-400/10",
  Controller: "text-purple-400 bg-purple-400/10",
  Sentinel: "text-yellow-400 bg-yellow-400/10",
  Initiator: "text-blue-400 bg-blue-400/10",
}

export default function PredictTab() {
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null)
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [selectedMap, setSelectedMap] = useState<string>("")
  const [result, setResult] = useState<PredictResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API}/model/info`)
      .then(r => r.json())
      .then(d => {
        setModelInfo(d)
        setSelectedMap(d.maps[0])
      })
  }, [])

  const toggleAgent = (agent: string) => {
    setSelectedAgents(prev => {
      if (prev.includes(agent)) return prev.filter(a => a !== agent)
      if (prev.length >= 5) return prev
      return [...prev, agent]
    })
    setResult(null)
  }

  const predict = () => {
    if (selectedAgents.length !== 5 || !selectedMap) return
    setLoading(true)
    setError(null)
    fetch(`${API}/predict?agents=${encodeURIComponent(selectedAgents.join(","))}&map=${encodeURIComponent(selectedMap)}`)
      .then(r => r.json())
      .then(d => {
        if (d.detail) setError(d.detail)
        else setResult(d)
        setLoading(false)
      })
      .catch(() => { setError("Request failed"); setLoading(false) })
  }

  if (!modelInfo) return <div className="text-gray-400 text-sm">Loading model...</div>

  // Group agents by role for the picker
  const agentsByRole: Record<string, string[]> = {}
  for (const agent of modelInfo.agents) {
    const role = AGENT_ROLES[agent] ?? "Other"
    if (!agentsByRole[role]) agentsByRole[role] = []
    agentsByRole[role].push(agent)
  }
  const roleOrder = ["Duelist", "Controller", "Sentinel", "Initiator", "Other"]

  const probPct = result?.win_probability_pct ?? 0
  const probColor = probPct >= 55 ? "text-green-400" : probPct <= 45 ? "text-red-400" : "text-yellow-400"

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Model info banner */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex gap-6 text-sm flex-wrap">
        <div>
          <span className="text-gray-500">Model</span>
          <span className="text-white ml-2">{modelInfo.model_type}</span>
        </div>
        <div>
          <span className="text-gray-500">CV Accuracy</span>
          <span className="text-white ml-2">{(modelInfo.cv_accuracy * 100).toFixed(1)}%</span>
          <span className="text-gray-600 text-xs ml-1">(50% = random)</span>
        </div>
        <div>
          <span className="text-gray-500">Features</span>
          <span className="text-white ml-2">{modelInfo.n_features}</span>
          <span className="text-gray-600 text-xs ml-1">(agents + maps)</span>
        </div>
        <div>
          <span className="text-gray-500">Training data</span>
          <span className="text-white ml-2">1,014 map games</span>
        </div>
      </div>

      {/* Map selector */}
      <div className="flex items-center gap-3">
        <span className="text-gray-400 text-sm font-medium">Map:</span>
        <div className="flex gap-2 flex-wrap">
          {modelInfo.maps.map(map => (
            <button
              key={map}
              onClick={() => { setSelectedMap(map); setResult(null) }}
              className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                selectedMap === map
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {map}
            </button>
          ))}
        </div>
      </div>

      {/* Agent picker */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-gray-400 text-sm font-medium">Pick 5 agents:</span>
          <span className={`text-sm font-medium ${selectedAgents.length === 5 ? "text-green-400" : "text-gray-500"}`}>
            {selectedAgents.length}/5
          </span>
          {selectedAgents.length > 0 && (
            <button
              onClick={() => { setSelectedAgents([]); setResult(null) }}
              className="text-xs text-gray-500 hover:text-gray-300 transition"
            >
              Clear
            </button>
          )}
        </div>

        <div className="space-y-3">
          {roleOrder.filter(role => agentsByRole[role]).map(role => (
            <div key={role} className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${ROLE_COLORS[role]}`}>
                {role}
              </span>
              {agentsByRole[role].map(agent => {
                const isSelected = selectedAgents.includes(agent)
                const isDisabled = !isSelected && selectedAgents.length >= 5
                return (
                  <button
                    key={agent}
                    onClick={() => !isDisabled && toggleAgent(agent)}
                    disabled={isDisabled}
                    className={`px-2.5 py-1 rounded text-sm transition ${
                      isSelected
                        ? "bg-blue-600 text-white"
                        : isDisabled
                        ? "bg-gray-800/30 text-gray-700 cursor-not-allowed"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    {agent}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Selected comp preview */}
      {selectedAgents.length > 0 && (
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-gray-500 text-sm">Selected:</span>
          {selectedAgents.map(a => (
            <span key={a} className="bg-blue-600/20 text-blue-300 text-xs px-2 py-1 rounded font-medium">
              {a}
            </span>
          ))}
        </div>
      )}

      {/* Predict button */}
      <button
        onClick={predict}
        disabled={selectedAgents.length !== 5 || !selectedMap || loading}
        className={`px-6 py-2.5 rounded font-medium transition ${
          selectedAgents.length === 5 && !loading
            ? "bg-blue-600 hover:bg-blue-700 text-white"
            : "bg-gray-800 text-gray-600 cursor-not-allowed"
        }`}
      >
        {loading ? "Predicting..." : "Predict Win Probability"}
      </button>

      {error && <div className="text-yellow-400 text-sm">⚠ {error}</div>}

      {/* Result */}
      {result && (
        <div className="border border-gray-800 rounded-lg overflow-hidden">
          <div className="bg-gray-900 px-6 py-5 flex items-center gap-6">
            <div>
              <div className={`text-5xl font-bold ${probColor}`}>
                {result.win_probability_pct.toFixed(1)}%
              </div>
              <div className="text-gray-400 text-sm mt-1">predicted win rate</div>
            </div>
            <div className="flex-1">
              {/* Visual bar */}
              <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    probPct >= 55 ? "bg-green-500" : probPct <= 45 ? "bg-red-500" : "bg-yellow-500"
                  }`}
                  style={{ width: `${result.win_probability_pct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 space-y-4">
            {/* Comp summary */}
            <div className="flex gap-2 flex-wrap">
              <span className="text-gray-500 text-sm">{result.map}:</span>
              {result.agents.map(a => (
                <span key={a} className="text-sm font-medium text-white">{a}</span>
              ))}
            </div>

            {/* Feature contributions */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
                What drove this prediction
              </h3>
              <div className="space-y-1.5">
                {result.feature_contributions.map((f, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm text-gray-300 w-28">{f.feature.replace("map_", "map: ")}</span>
                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${f.direction === "positive" ? "bg-green-500" : "bg-red-500"}`}
                        style={{ width: `${Math.min(Math.abs(f.coefficient) * 80, 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium w-14 text-right ${f.direction === "positive" ? "text-green-400" : "text-red-400"}`}>
                      {f.coefficient > 0 ? "+" : ""}{f.coefficient.toFixed(3)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Disclaimer */}
            <p className="text-gray-600 text-xs">{result.note}</p>
          </div>
        </div>
      )}
    </div>
  )
}