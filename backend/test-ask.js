const BASE = process.env.BASE_URL ?? 'http://localhost:8000'

// "all" = patterns that must appear somewhere in the response
// "label" = at least one claim must carry this label
const TESTS = [
  {
    q: 'Was the VPN login from Romania really Ayesha?',
    label: 'suspected',
    all: [/198\.51\.100\.77/]
  },
  {
    q: 'What is the overall severity of the incident with the large transfer, and why?',
    all: [/P1/, /SRV-FS01/]
  },
  {
    q: 'Should the internal vulnerability scan from 10.10.9.50 be escalated?',
    all: [/CHG-2026-1104-02/, /approved/i]
  },
  {
    q: 'Was the remote desktop session to SRV-DC01 by braza approved?',
    all: [/CHG-2026-1104-03/]
  },
  {
    q: 'When did the 2.4 GB transfer from SRV-FS01 start, in UTC?',
    all: [/06:03/]
  },
  {
    q: 'Which files were stolen from SRV-FS01?',
    label: 'insufficient'
  },
  {
    q: 'Who must be informed about the P1 incident and within what time?',
    all: [/Hamza Qureshi/, /15 minutes/, /Saima Noor/, /Mariam Chaudhry/]
  },
  {
    q: 'Did the SQL injection from 192.0.2.150 succeed?',
    label: 'suspected',
    all: [/48213|48,213/]
  },
  {
    q: 'Is the scan from 192.0.2.88 related to the SQL injection from 192.0.2.150?',
    all: [/separate|different|unrelated|not related|no shared/i]
  },
  {
    q: 'Did Sadia Raheel or Usman Tariq click the phishing link?',
    all: [/no |not |did not/i]
  },
  {
    q: 'Can we see what the attacker did on the internal network between 06:32 and 07:28 UTC?',
    label: 'insufficient',
    all: [/reboot|gap|not available|missing/i]
  },
  {
    q: 'What is the first thing to do about the amalik account?',
    all: [/07_runbook_credential_compromise\.md#S1/, /call|phone/i]
  },
  {
    q: 'Was the VPN firmware update on 4 November performed?',
    all: [/postponed|not performed/i]
  }
]

const pause = ms => new Promise(r => setTimeout(r, ms))
let passed = 0

for (const t of TESTS) {
  const started = Date.now()
  let status = 0
  let body = {}
  try {
    const res = await fetch(`${BASE}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: t.q })
    })
    status = res.status
    body = await res.json().catch(() => ({}))
  } catch (e) {
    body = { message: e.message }
  }

  const problems = []
  if (status !== 200) {
    problems.push(`HTTP ${status}: ${body.message ?? ''}`)
  } else {
    const text = JSON.stringify(body)
    const claims = body.claims ?? []
    if (t.label && !claims.some(c => c.label === t.label)) problems.push(`no claim labelled ${t.label}`)
    for (const re of t.all ?? []) if (!re.test(text)) problems.push(`missing ${re}`)
    if (t.label !== 'insufficient' && (body.citations ?? []).length === 0) problems.push('no citations')
    if ((body.removedCitations ?? []).length) problems.push(`removed citations: ${body.removedCitations.join(', ')}`)
  }

  const secs = ((Date.now() - started) / 1000).toFixed(1)
  if (problems.length === 0) {
    passed++
    console.log(`PASS (${secs}s) ${t.q}`)
  } else {
    console.log(`FAIL (${secs}s) ${t.q}`)
    for (const p of problems) console.log(`   - ${p}`)
    console.log(`   answer: ${body.answer ?? '(none)'}`)
    for (const c of body.claims ?? []) console.log(`   [${c.label}] ${c.text}`)
  }
  await pause(1500)
}

console.log(`\n${passed}/${TESTS.length} passed`)