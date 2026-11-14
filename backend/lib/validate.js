import fs from 'node:fs'
import path from 'node:path'
import { DATA, FILES } from './corpus.js'

// Build a set of every reference that really exists, like "11_vpn_auth_log.md#L7"
function buildIndex() {
  const valid = new Set()
  for (const f of FILES) {
    const lines = fs.readFileSync(path.join(DATA, f), 'utf8').split(/\r?\n/)
    valid.add(f) // whole-file reference without a line, e.g. 20_log_source_coverage.md
    valid.add(`${f}#`)

    // log lines: numbered inside the first code block
    const open = lines.findIndex(l => l.startsWith('```'))
    if (open !== -1) {
      let close = lines.findIndex((l, i) => i > open && l.startsWith('```'))
      if (close === -1) close = lines.length
      for (let n = 1; n < close - open; n++) valid.add(`${f}#L${n}`)
    }

    for (const l of lines) {
      // table rows: first column value, e.g. ALT-9005
      const row = l.match(/^\|\s*([^|]+?)\s*\|/)
      if (row && !/^[-:\s]+$/.test(row[1])) valid.add(`${f}#${row[1]}`)

      // numbered items: runbook steps (S3) and rules (R6.1)
      const item = l.match(/^(\d+(?:\.\d+)?)[.\s]/)
      if (item) {
        valid.add(`${f}#S${item[1]}`)
        valid.add(`${f}#R${item[1]}`)
      }
    }
  }
  return valid
}

const VALID = buildIndex()

export function isValidRef(ref) {
  return VALID.has(ref)
}

// "file#L7-L9" becomes file#L7, file#L8, file#L9. Anything else is returned unchanged.
function expandRange(ref) {
  const m = ref.match(/^(.+?)#L(\d+)\s*-\s*L?(\d+)$/)
  if (!m) return [ref]
  const file = m[1]
  const from = Number(m[2])
  const to = Number(m[3])
  if (to < from || to - from > 50) return [ref] // not a sensible range: stays as is and gets removed
  return Array.from({ length: to - from + 1 }, (_, i) => `${file}#L${from + i}`)
}

// Checks a model result and fixes what it can. Returns the cleaned result.
export function validateResult(result) {
  const listed = Array.isArray(result.citations) ? result.citations : []

  // also collect references written inline, including malformed ones like [[a#L2], [b#X]]
  const inline = [...String(result.answer ?? '').matchAll(/([0-9]{2}_[a-z0-9_]+\.md)#([A-Za-z0-9.\-]+)/g)]
    .map(m => `${m[1]}#${m[2].replace(/\.$/, '')}`)

  const all = [...new Set([...listed, ...inline].flatMap(expandRange))]
  const citations = all.filter(isValidRef)
  const invalid = all.filter(r => !isValidRef(r))

  let evidence = result.evidence
  let assumption = result.assumption ?? null
  const notes = []

  if (evidence === 'confirmed' && citations.length === 0) {
    evidence = 'suspected'
    assumption = assumption ?? 'No valid log line or row was cited for this answer.'
    notes.push('Changed to suspected: no valid citation.')
  } else if (evidence === 'confirmed' && assumption) {
    evidence = 'suspected'
    notes.push('Changed to suspected: the answer states an assumption.')
  }
  if (invalid.length) notes.push(`Removed ${invalid.length} citation(s) that do not exist.`)

  return { ...result, evidence, assumption, citations, removedCitations: invalid, notes }
}