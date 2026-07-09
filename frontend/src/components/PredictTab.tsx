import { useState, useEffect } from "react"
import { API } from "../api"

type PredictResult = {
  agents: string[]
  map: string
  win_probability: number
  win_probability_pct: number
  model_cv_accuracy: number
  note: string
  feature_contributions: { feature: string; coefficient: number; direction: string }[]
}

type ModelInfo = {
  cv_accuracy: number
  agents: string[]
  maps: string[]
  n_features: number
  model_type: string
}

const ROLE_ORDER = ["Duelist", "Controller", "Sentinel", "Initiator", "Other"]
const AGENT_ROLES: Record<string, string> = {
  Jett: "Duelist", Neon: "Duelist", Raze: "Duelist", Phoenix: "Duelist",
  Reyna: "Duelist", Yoru: "Duelist", Iso: "Duelist", Waylay: "Duelist", Veto: "Duelist",
  Omen: "Controller", Brimstone: "Controller", Astra: "Controller",
  Viper: "Controller", Harbor: "Controller", Clove: "Controller",
  Cypher: "Sentinel", Killjoy: "Sentinel", Sage: "Sentinel",
  Deadlock: "Sentinel", Chamber: "Sentinel", Vyse: "Sentinel",
  Sova: "Initiator", Fade: "Initiator", Breach: "Initiator", Skye: "Initiator",
  Kayo: "Initiator", Gekko: "Initiator", Tejo: "Initiator", Miks: "Initiator",
}
const ROLE_COLORS: Record<string, string> = {
  Duelist: "text-red-400", Controller: "text-purple-400",
  Sentinel: "text-yellow-400", Initiator: "text-blue-400", Other: "text-gray-400",
}

export default function PredictTab() {
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null)
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [selectedMap, setSelectedMap] = useState<string>("")
  const [result, setResult] = useState<PredictResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API}/model/info`).then(r => r.json()).then(d => {
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
      .then(d => { d.detail ? setError(d.detail) : setResult(d); setLoading(false) })
      .catch(() => { setError("Request failed"); setLoading(false) })
  }

  if (!modelInfo) return <div className="text-gray-500 text-sm">Loading model...</div>

  const agentsByRole: Record<string, string[]> = {}
  for (const agent of modelInfo.agents) {
    const role = AGENT_ROLES[agent] ?? "Other"
    if (!agentsByRole[role]) agentsByRole[role] = []
    agentsByRole[role].push(agent)
  }

  const probPct = result?.win_probability_pct ?? 0
  const probColor = probPct >= 55 ? "text-green-400" : probPct <= 45 ? "text-red-400" : "text-yellow-400"

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Model info */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Model type", value: "Logistic regression" },
          { label: "CV accuracy", value: `${(modelInfo.cv_accuracy * 100).toFixed(1)}%`, sub: "50% = random baseline" },
          { label: "Training data", value: "1,014 map games" },
        ].map(c => (
          <div key={c.label} className="bg-gray-900 rounded-lg p-3 border border-gray-800/50">
            <div className="text-xs text-gray-500 mb-1">{c.label}</div>
            <div className="text-sm font-medium text-white">{c.value}</div>
            {c.sub && <div className="text-xs text-gray-600 mt-0.5">{c.sub}</div>}
          </div>
        ))}
      </div>

      {/* Map selector */}
      <div>
        <div className="text-xs text-gray-500 mb-2">Map</div>
        <div className="flex gap-1.5 flex-wrap">
          {modelInfo.maps.map(map => (
            <button key={map} onClick={() => { setSelectedMap(map); setResult(null) }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                selectedMap === map ? "bg-blue-600 text-white" : "bg-gray-900 text-gray-400 hover:text-gray-200 border border-gray-800"
              }`}
            >
              {map}
            </button>
          ))}
        </div>
      </div>

      {/* Agent picker */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-gray-500">Pick 5 agents</span>
          <span className={`text-xs font-medium ${selectedAgents.length === 5 ? "text-green-400" : "text-gray-600"}`}>
            {selectedAgents.length}/5
          </span>
          {selectedAgents.length > 0 && (
            <button onClick={() => { setSelectedAgents([]); setResult(null) }} className="text-xs text-gray-600 hover:text-gray-400 transition">
              clear
            </button>
          )}
        </div>

        <div className="space-y-2.5">
          {ROLE_ORDER.filter(r => agentsByRole[r]).map(role => (
            <div key={role} className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-medium w-20 ${ROLE_COLORS[role]}`}>{role}</span>
              {agentsByRole[role].map(agent => {
                const isSelected = selectedAgents.includes(agent)
                const isDisabled = !isSelected && selectedAgents.length >= 5
                return (
                  <button key={agent} onClick={() => !isDisabled && toggleAgent(agent)} disabled={isDisabled}
                    className={`px-2.5 py-1 rounded-md text-xs transition ${
                      isSelected ? "bg-blue-600 text-white"
                      : isDisabled ? "bg-gray-900/30 text-gray-700 cursor-not-allowed"
                      : "bg-gray-900 text-gray-300 hover:text-white border border-gray-800"
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

      {/* Selected preview */}
      {selectedAgents.length > 0 && (
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className="text-xs text-gray-600">Selected:</span>
          {selectedAgents.map(a => (
            <span key={a} className="text-xs bg-blue-600/20 text-blue-300 px-2 py-0.5 rounded font-medium">{a}</span>
          ))}
        </div>
      )}

      <button onClick={predict} disabled={selectedAgents.length !== 5 || loading}
        className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
          selectedAgents.length === 5 && !loading
            ? "bg-blue-600 hover:bg-blue-700 text-white"
            : "bg-gray-800 text-gray-600 cursor-not-allowed"
        }`}
      >
        {loading ? "Predicting..." : "Predict win probability"}
      </button>

      {error && <div className="text-amber-500 text-xs">⚠ {error}</div>}

      {result && (
        <div className="border border-gray-800/60 rounded-lg overflow-hidden">
          <div className="bg-gray-900/60 px-5 py-4 flex items-center gap-5">
            <div>
              <div className={`text-4xl font-bold ${probColor}`}>{result.win_probability_pct.toFixed(1)}%</div>
              <div className="text-xs text-gray-500 mt-1">predicted win rate</div>
            </div>
            <div className="flex-1">
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${probPct >= 55 ? "bg-green-500" : probPct <= 45 ? "bg-red-500" : "bg-yellow-500"}`}
                  style={{ width: `${result.win_probability_pct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-700 mt-1">
                <span>0%</span><span>50%</span><span>100%</span>
              </div>
            </div>
          </div>

          <div className="px-5 py-4 space-y-4">
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-xs text-gray-500">{result.map}:</span>
              {result.agents.map(a => <span key={a} className="text-xs text-white font-medium">{a}</span>)}
            </div>

            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">What drove this prediction</div>
              <div className="space-y-1.5">
                {result.feature_contributions.map((f, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-28">{f.feature.replace("map_", "map: ")}</span>
                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
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

            <p className="text-xs text-gray-600">{result.note}</p>
          </div>
        </div>
      )}
    </div>
  )
}