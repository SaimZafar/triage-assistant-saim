import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(fileURLToPath(import.meta.url))
export const DATA = path.join(dir, '..', '..', 'problem_c_data')
export const FILES = fs.readdirSync(DATA).filter(f => f.endsWith('.md')).sort()

function numbered(name, text) {
  const lines = text.split(/\r?\n/)
  const fences = lines.filter(l => l.startsWith('```')).length
  if (fences === 0) return lines.join('\n')
  if (fences > 2) console.warn(`${name}: ${fences} code fences, only the first block is numbered`)

  const open = lines.findIndex(l => l.startsWith('```'))
  let close = lines.findIndex((l, i) => i > open && l.startsWith('```'))
  if (close === -1) close = lines.length

  return lines
    .map((l, i) => (i > open && i < close ? `L${i - open}| ${l}` : l))
    .join('\n')
}

export function buildCorpus() {
  return FILES.map(f => {
    const raw = fs.readFileSync(path.join(DATA, f), 'utf8')
    return `=== FILE: ${f} ===\n${numbered(f, raw)}`
  }).join('\n\n')
}