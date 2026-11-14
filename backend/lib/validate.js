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
const LABELS = ['confirmed', 'suspected', 'insufficient']

export function isValidRef(ref) {
  return VALID.has(ref)
}

// "file#L7-L9" becomes file#L7, file#L8, file#L9. Anything else is returned unchanged.
export function expandRange(ref) {
  const m = ref.match(/^(.+?)#L(\d+)\s*-\s*L?(\d+)$/)
  if (!m) return [ref]
  const file = m[1]
  const from = Number(m[2])
  const to = Number(m[3])
  if (to < from || to - from > 50) return [ref] // not a sensible range: stays as is and gets removed
  return Array.from({ length: to - from + 1 }, (_, i) => `${file}#L${from + i}`)
}

// Removes [[file#ref]] tags from text, including malformed ones like [[a#L2], [b#X]]
export function stripTags(text) {
  return String(text ?? '')
    .replace(/(?:\[+[^\[\]]*\.md[^\[\]]*\]+[\s,]*)+/g, '')
    .replace(/\s+([.,;:])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// Checks one claim: drops citations that do not exist and fixes labels that the evidence does not support
function checkClaim(claim, index, removed, notes) {
  const n = index + 1
  const given = Array.isArray(claim?.citations) ? claim.citations : []
  const refs = [...new Set(given.flatMap(c => expandRange(String(c).trim())))]
  const citations = refs.filter(isValidRef)
  for (const r of refs) if (!isValidRef(r)) removed.add(r)

  let label = claim?.label
  let assumption = claim?.assumption ? String(claim.assumption).trim() : null

  if (!LABELS.includes(label)) {
    label = 'suspected'
    notes.push(`Claim ${n}: unknown label, set to suspected.`)
  }

  if (label === 'confirmed' && citations.length === 0) {
    label = 'suspected'
    assumption = assumption ?? 'No valid log line or row was cited for this claim.'
    notes.push(`Claim ${n}: changed to suspected (no valid citation).`)
  } else if (label === 'confirmed' && assumption) {
    label = 'suspected'
    notes.push(`Claim ${n}: changed to suspected (an assumption is stated).`)
  } else if (label === 'suspected' && !assumption) {
    notes.push(`Claim ${n}: suspected but no assumption was stated.`)
  }
  if (label === 'insufficient') assumption = null

  return { text: stripTags(claim?.text), label, citations, assumption }
}

// Checks a whole model result. Returns the cleaned result in the shape the frontend uses.
export function validateResult(result) {
  const notes = []
  const removed = new Set()

  const rawClaims = Array.isArray(result?.claims) ? result.claims : []
  const claims = rawClaims
    .map((c, i) => checkClaim(c, i, removed, notes))
    .filter(c => c.text)

  const labels = claims.map(c => c.label)
  let evidence
  if (labels.length === 0 || labels.every(l => l === 'insufficient')) evidence = 'insufficient'
  else if (labels.includes('suspected')) evidence = 'suspected'
  else evidence = 'confirmed'
  if (labels.length === 0) notes.push('The model returned no claims.')

  const assumption =
    [...new Set(claims.filter(c => c.label === 'suspected' && c.assumption).map(c => c.assumption))].join(' ') || null
  const citations = [...new Set(claims.flatMap(c => c.citations))]
  const gaps = (Array.isArray(result?.gaps) ? result.gaps : []).map(stripTags).filter(Boolean)
  const answer = stripTags(result?.answer) || claims[0]?.text || ''

  if (removed.size) notes.push(`Removed ${removed.size} citation(s) that do not exist.`)

  return { answer, claims, evidence, assumption, citations, gaps, removedCitations: [...removed], notes }
}