export type Filters = {
  event: string
  map: string
  region: string
}

export const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000"

export async function fetchAPI(endpoint: string, filters: Filters, extra = "") {
  const params = new URLSearchParams()
  if (filters.event !== "All") params.set("event", filters.event)
  if (filters.map !== "All") params.set("map", filters.map)
  if (filters.region !== "All") params.set("region", filters.region)
  if (extra) extra.split("&").forEach(p => {
    const [k, v] = p.split("=")
    params.set(k, v)
  })
  const res = await fetch(`${API}/${endpoint}?${params}`)
  return res.json()
}