import fs from 'node:fs'
import path from 'node:path'
import { DATA } from './corpus.js'
import { isValidRef, expandRange, stripTags } from './validate.js'

export const REPORT_SYSTEM = `You are the security incident triage assistant for Orbit Logistics. Write the full incident report for the logs provided, using only the files provided. Never use outside knowledge. Follow the company security rules in file 01 exactly.

Method:

1. Read file 20 first. Convert every time to UTC before comparing events. The internal firewall logs a session when it closes, not when it starts, so the start is the logged time minus the duration. Compare the coverage windows in file 20 with the time of the attacker's activity: a gap or a missing log source goes in "missing_sources" and "insufficient" and is never filled with a guess. If a gap overlaps the attacker's session, say so in an "insufficient" item.

2. Find every separate incident. Incidents with no shared evidence are separate and are scored separately (rule 4.3). One incident with several parts gets the highest severity of its parts (rule 4.2). Do not merge unrelated activity.

3. Check each activity against the change calendar in file 05, which is written in PKT. An activity is approved only if the system, the person or tool, and a time window that contains the activity all match (rule 3.1). Approved activity is not an incident: put it in "closed_harmless" with the change ID and the reason, and give it no severity. A change that was postponed or not performed approves nothing.

4. Severity: use the matrix in file 03. Choose the row by incident type and the column by the criticality of the most critical asset the attacker actually reached, meaning a confirmed login or session (rule 4.1). Criticality comes from file 02. Rule 4.2 says to report each part of an incident: in "steps", write one step per part (for example the phishing click handled as credential compromise, and the data exfiltration), each with its own matrix row, asset, and P-level, and then one step that gives the highest. The "severity" field is that highest P-level. A phishing email where a click is seen is handled as credential compromise (file 03). The attacker reached an asset only if a log shows a login or a session on that host itself, or traffic to the service that holds the data. A Kerberos ticket request or a password reset handled by SRV-DC01 only authenticates the account: it is not a login or session on SRV-DC01, so SRV-DC01 is not a reached asset. Start each step with the matrix row, the asset and its criticality, and the P-level, for example "Data exfiltration, SRV-FS01 (High): P1."

5. Actions: recommend only actions that appear in the runbooks (files 06 to 10) and cite the runbook step. Never invent actions. For every incident, list every runbook step that still has to be done, one action per step, and skip only steps that do not apply (for example a step for an internal source when the source is external) or that the logs already completed. Include warning all recipients of a phishing email, keeping logs unchanged as evidence, asking the web team to review the attacked page, checking that the SQL injection rule is active on the web filter, checking which scanned ports answered, and watching a scan source for 24 hours.

6. People to inform: only as listed in the escalation sheet (file 04), for the severity of each incident, with the time limit for that severity. Use only the rows for the severity of that incident: a P1 incident gets only the P1 rows and no P2 contacts. For a row that says data owner or system owner, name the real person from the asset inventory (file 02) when one is listed.

Evidence labels:

- "confirmed" = a single log line or table row shows it directly. Cite it. Use only plain wording of what the line shows. Never use words like "indicating", "suggesting", "likely", "successful attack" or "stolen" in a confirmed item.
- "suspected" = it fits an attack pattern but you must guess to link things together. State the guess in "assumption". A log that shows an account name shows that account, not who was behind it. Linking an account to an attacker or a person is "suspected".
- The following are always "suspected" and never "confirmed": (a) that an attack on a web server succeeded, because a large 200 response only shows a response size and not what was in it; (b) that a person clicked a link or typed a password, because a connection to a link address shows a connection and not what was typed; (c) that an attacker or a stolen password was behind a login, a password reset or a session; (d) any link between two events in different logs that needs a guess.
- "insufficient" = the logs are silent or missing. Do not fill the gap with a guess.
- Never write that a person clicked a link, in any text including "insufficient" and "steps". Write that the laptop connected to the link address. Put "the user clicked and typed a password" in "suspected" with its assumption.
- A gap in one log does not affect events that another log records. In the "insufficient" item for a gap, name only what that log hides (for example other sessions in that window) and do not say that events recorded by another log are unconfirmed.
- A transfer that a firewall line shows is confirmed. What is suspected is who did it and which files were read. Do not call the transfer itself suspected in the summary.
- Never write that data was stolen or leaked unless a log shows the data moving. A large transfer shows a transfer, not which files were read.
- The summary must follow the same labels: write suspected things as suspected ("is suspected to", "may have"), never as fact. Do not write that an attack "was successful" unless a log line shows it directly.

Format rules:

- Times: UTC. In "event" text you may add PKT (UTC+5) in brackets.
- Every text is one short sentence. Do not put [[ ]] tags in any text.
- Citations are strings written as file#ref, for example "11_vpn_auth_log.md#L7". Log lines: L followed by the number shown at the start of the line. List each line separately, never a range. Table rows: the value in the first column, for example "17_ids_alert_summary.md#ALT-9005", "05_change_calendar.md#CHG-2026-1104-02", "02_asset_inventory.md#A-1005", "04_escalation_and_contacts.md#P1". Runbook steps: "07_runbook_credential_compromise.md#S2". Rules: "01_company_security_rules.md#R6.1". The severity matrix and file 20 are cited by file name only.
- Only cite lines and rows you can actually see. Never invent a reference.
- Every timeline event, claim, action and contact needs at least one citation.

Answer with JSON only, in this shape:

{
"summary": string (three to five sentences),
"timeline": [{"time_utc": "YYYY-MM-DDTHH:MM:SSZ", "event": string, "citations": [string]}],
"affected": [{"name": string, "kind": "asset" | "account", "note": string, "citations": [string]}],
"severity": [{"incident": string, "type": string, "asset": string, "criticality": string, "severity": "P1" | "P2" | "P3" | "P4", "steps": [string], "citations": [string]}],
"overall_severity": "P1" | "P2" | "P3" | "P4",
"confirmed": [{"text": string, "citations": [string]}],
"suspected": [{"text": string, "assumption": string, "citations": [string]}],
"insufficient": [{"text": string, "citations": [string]}],
"missing_sources": [string],
"closed_harmless": [{"activity": string, "change_id": string, "reason": string, "citations": [string]}],
"actions": [{"incident": string, "text": string, "runbook": string, "step": number, "citations": [string]}],
"inform": [{"incident": string, "name": string, "role": string, "time_limit": string, "citations": [string]}]
}`

const RANK = { P1: 1, P2: 2, P3: 3, P4: 4 }
const list = v => (Array.isArray(v) ? v : [])
const isRunbookStep = ref => /^(0[6-9]|10)_[^#]+\.md#S\d+$/.test(ref)

// A "confirmed" item must state only what a log line shows. These patterns catch wording that
// needs a guess (rules 2.1, 2.2, 2.4). A match moves the item to "suspected".
const GUESS_PATTERNS = [
  // hedging words: the claim is a conclusion, not a line of the log
  /\b(indicat(?:e|es|ed|ing)|suggest(?:s|ed|ing)?|likely|probabl[ey]|possibl[ey]|presumabl[ey]|appears? to|seems? to|may have|might have|could have|implies|implying)\b/i,
  // an attack succeeded: a response size does not show what was returned
  /\b(sql|injection|sqli|exploit|web (?:application )?attack|attack)\b[^.]*\b(success(?:ful|fully)?|succeed(?:ed|s)?|worked|breached)\b/i,
  /\b(success(?:ful|fully)?|succeed(?:ed|s)?)\b[^.]*\b(sql|injection|sqli|exploit|web (?:application )?attack)\b/i,
  // a person did something, or an attacker/stolen password was behind an event
  /\b(clicked|entered (?:her|his|their|the) password|typed (?:her|his|their|the) password|fell for|was phished|phished)\b/i,
  /\b(stolen|compromised) (?:credentials|password|account)\b/i,
  /\battacker (?:used|using|logged|performed|reset|accessed)\b/i,
  /\b(?:data|files?) (?:was|were) (?:stolen|leaked|exfiltrated|read)\b/i
]

const needsGuess = text => GUESS_PATTERNS.some(p => p.test(text))

// Reads the runbook ID (for example RB-CRED-02) from the first line of the runbook file
function runbookId(ref) {
  try {
    const file = ref.split('#')[0]
    const head = fs.readFileSync(path.join(DATA, file), 'utf8').split(/\r?\n/)[0]
    return head.match(/RB-[A-Z]+-\d+/)?.[0] ?? null
  } catch {
    return null
  }
}

// Checks a model report against the rules in file 01 and the real data. Returns the cleaned report.
export function validateReport(report) {
  const r = report ?? {}
  const notes = []
  const removed = new Set()

  // keeps only citations that really exist
  const fix = item => {
    const refs = [...new Set(list(item?.citations).flatMap(c => expandRange(String(c).trim())))]
    for (const x of refs) if (!isValidRef(x)) removed.add(x)
    return refs.filter(isValidRef)
  }

  // Timeline: every event needs a time and a valid citation
  let timeline = list(r.timeline).map(t => ({
    time_utc: String(t?.time_utc ?? '').trim(),
    event: stripTags(t?.event),
    citations: fix(t)
  }))
  const timelineBefore = timeline.length
  timeline = timeline.filter(t => t.event && t.time_utc && t.citations.length > 0)
  if (timeline.length < timelineBefore) {
    notes.push(`Timeline: dropped ${timelineBefore - timeline.length} event(s) with no valid citation or time.`)
  }
  timeline.sort((a, b) => a.time_utc.localeCompare(b.time_utc))

  const affected = list(r.affected)
    .map(a => ({
      name: stripTags(a?.name),
      kind: a?.kind === 'account' ? 'account' : 'asset',
      note: stripTags(a?.note),
      citations: fix(a)
    }))
    .filter(a => a.name)

  // Severity: the whole report gets the highest severity (rule 4.2)
  const severity = list(r.severity)
    .map(s => ({
      incident: stripTags(s?.incident),
      type: stripTags(s?.type),
      asset: stripTags(s?.asset),
      criticality: stripTags(s?.criticality),
      severity: RANK[s?.severity] ? s.severity : null,
      steps: list(s?.steps).map(stripTags).filter(Boolean),
      citations: fix(s)
    }))
    .filter(s => s.incident)
  for (const s of severity) if (!s.severity) notes.push(`Severity: "${s.incident}" has no valid P1 to P4 value.`)
  const levels = severity.map(s => s.severity).filter(Boolean)
  const overall = levels.sort((a, b) => RANK[a] - RANK[b])[0] ?? null
  if (r.overall_severity && overall && r.overall_severity !== overall) {
    notes.push(`Overall severity corrected from ${r.overall_severity} to ${overall} (highest of the incidents).`)
  }

  // Confirmed / suspected / insufficient (rules 2.1 to 2.3)
  const suspected = list(r.suspected)
    .map(s => ({ text: stripTags(s?.text), assumption: stripTags(s?.assumption) || null, citations: fix(s) }))
    .filter(s => s.text)

  const confirmed = []
  for (const c of list(r.confirmed)) {
    const item = { text: stripTags(c?.text), citations: fix(c) }
    if (!item.text) continue
    if (item.citations.length === 0) {
      suspected.push({ text: item.text, assumption: 'No valid log line or row was cited for this claim.', citations: [] })
      notes.push('Confirmed: moved a claim to suspected (no valid citation).')
    } else if (needsGuess(item.text)) {
      suspected.push({
        text: item.text,
        assumption: 'The cited lines show the events, but this conclusion links them with a guess that the logs do not show directly.',
        citations: item.citations
      })
      notes.push(`Confirmed: moved to suspected (needs a guess): "${item.text.slice(0, 60)}".`)
    } else {
      confirmed.push(item)
    }
  }

  const insufficient = list(r.insufficient)
    .map(i => ({ text: stripTags(i?.text), citations: fix(i) }))
    .filter(i => i.text)

  // Closed as harmless: the change ID must exist in the change calendar (rule 3.1)
  const closed_harmless = []
  for (const c of list(r.closed_harmless)) {
    const activity = stripTags(c?.activity)
    const changeId = String(c?.change_id ?? '').trim()
    if (!activity) continue
    const changeRef = `05_change_calendar.md#${changeId}`
    if (isValidRef(changeRef)) {
      closed_harmless.push({
        activity,
        change_id: changeId,
        reason: stripTags(c?.reason),
        citations: [...new Set([changeRef, ...fix(c)])]
      })
    } else {
      suspected.push({
        text: `${activity} (claimed as approved, but change ID "${changeId}" is not in the change calendar)`,
        assumption: 'Treated as not approved because no matching change was found.',
        citations: fix(c)
      })
      notes.push(`Closed as harmless: "${activity}" moved to suspected (unknown change ID).`)
    }
  }

  for (const s of suspected) {
    if (!s.assumption) notes.push(`Suspected: no assumption stated for "${s.text.slice(0, 60)}".`)
  }

  // Actions: only from runbooks, with a real step (rule 5.1)
  const actions = []
  const seen = new Set()
  for (const a of list(r.actions)) {
    const text = stripTags(a?.text)
    if (!text) continue
    const citations = fix(a)
    const stepRef = citations.find(isRunbookStep)
    if (!stepRef) {
      notes.push(`Actions: dropped "${text.slice(0, 60)}" (no valid runbook step cited).`)
      continue
    }
    const incident = stripTags(a?.incident)
    const key = `${incident}|${stepRef}`
    if (seen.has(key)) continue // the same runbook step twice for one incident
    seen.add(key)
    actions.push({
      incident,
      text,
      runbook: runbookId(stepRef) ?? stripTags(a?.runbook),
      step: Number(stepRef.split('#S')[1]),
      citations
    })
  }

  // People to inform: only from the escalation sheet, for the severity of the incident (rule 5.2)
  const inform = []
  for (const p of list(r.inform)) {
    const name = stripTags(p?.name)
    if (!name) continue
    const citations = fix(p)
    if (!citations.some(c => c.startsWith('04_escalation_and_contacts.md#'))) {
      notes.push(`Inform: dropped "${name}" (no escalation sheet row cited).`)
      continue
    }
    const incidentName = stripTags(p?.incident)
    const level = severity.find(s => s.incident === incidentName)?.severity
    if (level && !citations.includes(`04_escalation_and_contacts.md#${level}`)) {
      notes.push(`Inform: dropped "${name}" for "${incidentName}" (the escalation row is not for ${level}).`)
      continue
    }
    inform.push({
      incident: incidentName,
      name,
      role: stripTags(p?.role),
      time_limit: stripTags(p?.time_limit),
      citations
    })
  }

  if (removed.size) notes.push(`Removed ${removed.size} citation(s) that do not exist.`)

  return {
    summary: stripTags(r.summary),
    timeline,
    affected,
    severity,
    overall_severity: overall,
    confirmed,
    suspected,
    insufficient,
    missing_sources: list(r.missing_sources).map(stripTags).filter(Boolean),
    closed_harmless,
    actions,
    inform,
    removedCitations: [...removed],
    notes
  }
}