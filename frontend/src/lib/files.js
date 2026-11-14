// Loads one data file for the evidence drawer.
// Normal mode: GET /api/files/:name from the backend.
// ?mock mode: read the file straight from ../problem_c_data so the drawer works with no backend.
const BASE = import.meta.env.VITE_API_URL ?? ''
const local = import.meta.glob('../../../problem_c_data/*.md', { query: '?raw', import: 'default' })

export const isMock = () => new URLSearchParams(location.search).has('mock')

export async function loadFile(name) {
  if (isMock()) {
    const key = Object.keys(local).find(k => k.endsWith('/' + name))
    if (!key) throw new Error(`File not found: ${name}`)
    return { name, content: await local[key]() }
  }
  const res = await fetch(`${BASE}/api/files/${encodeURIComponent(name)}`)
  if (!res.ok) throw new Error(`File not found: ${name}`)
  return res.json()
}
