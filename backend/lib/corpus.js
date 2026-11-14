import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(fileURLToPath(import.meta.url))
export const DATA = path.join(dir, '..', '..', 'problem_c_data')
export const FILES = fs.readdirSync(DATA).filter(f => f.endsWith('.md')).sort()

function numbered(text) {
  const lines = text.split('\n')
  const open = lines.findIndex(l => l.startsWith('```'))
  if (open === -1) return text
  const close = lines.findIndex((l, i) => i > open && l.startsWith('```'))
  return lines
    .map((l, i) => (i > open && i < close ? `L${i - open}| ${l}` : l))
    .join('\n')
}

export function buildCorpus() {
  return FILES.map(f => {
    const raw = fs.readFileSync(path.join(DATA, f), 'utf8')
    return `=== FILE: ${f} ===\n${numbered(raw)}`
  }).join('\n\n')
}