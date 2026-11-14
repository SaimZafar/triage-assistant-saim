import fs from 'node:fs'
import path from 'node:path'
import { DATA } from './corpus.js'

const tags = list => (list ?? []).map(c => `[[${c}]]`).join(' ')
const withCites = (text, citations) => `${text ?? ''} ${tags(citations)}`.trim()

// Asset inventory rows: the first column is the tag (A-1005), the other cells hold names such as SRV-FS01.
function loadAssets() {
  const rows = []
  try {
    const file = fs.readdirSync(DATA).find(f => f.startsWith('02_'))
    const text = fs.readFileSync(path.join(DATA, file), 'utf8')
    for (const line of text.split(/\r?\n/)) {
      if (!line.startsWith('|')) continue
      const cells = line.split('|').slice(1, -1).map(c => c.trim())
      if (/^A-\d{4}$/.test(cells[0])) rows.push({ tag: cells[0], names: cells.slice(1).filter(c => c.length > 2) })
    }
  } catch {
    // no inventory: assets are left out
  }
  return rows
}
const ASSETS = loadAssets()

function tagFor(name) {
  const n = String(name ?? '').toLowerCase()
  const exact = ASSETS.find(r => r.names.some(x => x.toLowerCase() === n))
  if (exact) return exact.tag
  const partial = ASSETS.find(r => r.names.some(x => /[0-9-]/.test(x) && n.includes(x.toLowerCase())))
  return partial?.tag
}

// The backend report has one flat list per section. The frontend wants everything grouped per incident,
// so each item is placed by the addresses, systems and runbooks it mentions.
const WEB = /192\.0\.2\.150|sql|injection|13_web_server_log|runbook_web|ALT-9004/i
const SCAN = /192\.0\.2\.88|port scan|scanning|reconnaissance|runbook_scan|ALT-9001/i

function kindOfText(text, citations = []) {
  const s = `${text} ${citations.join(' ')}`
  if (WEB.test(s)) return 'web'
  if (SCAN.test(s)) return 'scan'
  return 'main'
}

function kindOfTitle(title) {
  if (/sql|web application/i.test(title)) return 'web'
  if (/scan|recon/i.test(title)) return 'scan'
  return 'main'
}

function limitMinutes(text) {
  const m = String(text ?? '').match(/(\d+)\s*(minute|hour)/i)
  if (!m) return null
  return Number(m[1]) * (/hour/i.test(m[2]) ? 60 : 1)
}

function externalIps(text) {
  const out = new Set()
  for (const ip of String(text).match(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g) ?? []) {
    if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip)) continue
    out.add(ip)
  }
  return [...out]
}

export function adaptReport(r) {
  const incidents = (r.severity ?? []).map((s, i) => ({
    id: `INC-${i + 1}`,
    kind: kindOfTitle(s.incident),
    asset: s.asset ?? '',
    title: s.incident,
    severity: s.severity ?? null,
    severityWhy: withCites((s.steps ?? []).join(' '), s.citations),
    summary: `${s.type}. Most critical asset reached: ${s.asset} (${s.criticality}).`,
    timeline: [],
    assets: [],
    accounts: [],
    externals: [],
    path: [],
    confirmed: [],
    suspected: [],
    insufficient: [],
    actions: [],
    inform: []
  }))

  if (incidents.length === 0) return { ...r, incidents: [] }

  const target = kind => incidents.find(i => i.kind === kind) ?? incidents[0]
  const byName = name => incidents.find(i => i.title === name) ?? incidents[0]

  for (const t of r.timeline ?? []) {
    const inc = target(kindOfText(t.event, t.citations))
    inc.timeline.push({ utc: t.time_utc, text: withCites(t.event, t.citations), incidentId: inc.id })
  }
  for (const c of r.confirmed ?? []) {
    target(kindOfText(c.text, c.citations)).confirmed.push({ text: withCites(c.text, c.citations), evidence: 'confirmed' })
  }
  for (const c of r.suspected ?? []) {
    target(kindOfText(c.text, c.citations)).suspected.push({
      text: withCites(c.text, c.citations),
      evidence: 'suspected',
      assumption: c.assumption ?? undefined
    })
  }
  for (const c of r.insufficient ?? []) {
    target(kindOfText(c.text, c.citations)).insufficient.push({ text: withCites(c.text, c.citations), evidence: 'insufficient' })
  }
  for (const a of r.actions ?? []) {
    byName(a.incident).actions.push({ text: withCites(a.text, a.citations), runbook: a.runbook, step: a.step })
  }
  for (const p of r.inform ?? []) {
    byName(p.incident).inform.push({
      who: p.name,
      how: p.role,
      limitMinutes: limitMinutes(p.time_limit)
    })
  }
  for (const a of r.affected ?? []) {
    const inc = target(kindOfText(`${a.name} ${a.note}`, a.citations))
    if (a.kind === 'account') {
      if (!inc.accounts.includes(a.name)) inc.accounts.push(a.name)
      continue
    }
    const tag = tagFor(a.name)
    if (!tag || inc.assets.some(x => x.tag === tag)) continue
    const reached = inc.asset.toLowerCase().includes(String(a.name).toLowerCase())
    inc.assets.push({ tag, role: reached ? 'reached' : 'involved' })
  }
  for (const inc of incidents) {
    const text = [...inc.timeline, ...inc.confirmed, ...inc.suspected].map(x => x.text).join(' ')
    inc.externals = externalIps(text).map(ip => ({ ip }))
    delete inc.kind
    delete inc.asset
    inc.timeline.sort((a, b) => a.utc.localeCompare(b.utc))
  }

  return {
    generatedAt: r.generated_at,
    model: r.source ?? 'gemini',
    overallSeverity: r.overall_severity,
    summary: r.summary,
    incidents,
    missingSources: (r.missing_sources ?? []).map(name => ({ name, why: '' })),
    closedHarmless: (r.closed_harmless ?? []).map(c => ({
      what: c.activity,
      changeId: c.change_id,
      why: withCites(c.reason, c.citations)
    })),
    cached: r.cached,
    source: r.source
  }
}