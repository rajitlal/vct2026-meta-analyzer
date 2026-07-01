import { useState, useEffect, useCallback } from "react"
import { fetchAPI, type Filters } from "../api"

type CounterStat = {
  opp_agent: string
  my_agent: string
  appearances: number
  wins: number
  win_rate: number
}

export default function CounterTab({ filters }: { filters: Filters }) {
  const [data, setData] = useState<CounterStat[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOpp, setSelectedOpp] = useState<string>("All")

  const load = useCallback(() => {
    fetchAPI("counter", filters, "min_appearances=8").then(d => {
      setData(d)
      setLoading(false)
    })
  }, [filters])

  useEffect(() => { load() }, [load])

  const oppAgents = ["All", ...Array.from(new Set(data.map(d => d.opp_agent))).sort()]
  const filtered = selectedOpp === "All" ? data : data.filter(d => d.opp_agent === selectedOpp)

  if (loading) return <div className="text-gray-400 text-sm">Loading...</div>
  if (!data.length) return <div className="text-gray-400 text-sm">No counter-pick data for selected filters.</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-gray-400 text-sm">Opponent runs:</span>
        <select
          className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none"
          value={selectedOpp}
          onChange={e => setSelectedOpp(e.target.value)}
        >
          {oppAgents.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <span className="text-gray-500 text-sm">→ what beats it?</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left py-2 pr-4 text-gray-400 font-medium">Opponent Agent</th>
              <th className="text-left py-2 pr-4 text-gray-400 font-medium">Your Agent</th>
              <th className="text-right py-2 pr-4 text-gray-400 font-medium">Sample</th>
              <th className="text-right py-2 text-gray-400 font-medium">Win Rate</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="py-2 pr-4 text-gray-300">{row.opp_agent}</td>
                <td className="py-2 pr-4 font-medium text-white">{row.my_agent}</td>
                <td className="py-2 pr-4 text-right text-gray-400">{row.appearances}</td>
                <td className={`py-2 text-right font-semibold ${
                  row.win_rate > 0.6 ? "text-green-400" :
                  row.win_rate < 0.4 ? "text-red-400" : "text-gray-300"
                }`}>
                  {(row.win_rate * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}