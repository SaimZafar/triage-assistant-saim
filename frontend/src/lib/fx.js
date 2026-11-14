import { lazy } from 'react'

// Optional animation components, loaded on demand so the console stays small.
// fx('GlassSurface') returns a lazy component if src/components/fx/GlassSurface.jsx exists, else null.
const loaders = import.meta.glob('../components/fx/*.{jsx,tsx}')
const cache = {}

export function fx(name) {
  const key = Object.keys(loaders).find(k => k.split('/').pop().replace(/\.(jsx|tsx)$/, '') === name)
  if (!key) return null
  return (cache[name] ??= lazy(loaders[key]))
}
