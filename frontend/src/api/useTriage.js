/*
  Contract with the backend (Saim). Plain JavaScript, so the shapes live here as a comment.

  POST /api/report  body {}                    -> ReportResponse
  POST /api/ask     body { question }          -> AskResponse
  GET  /api/files/:name                        -> { name, content }
  GET  /api/health                             -> { ok: true }
  Errors: normal HTTP status + { message, retryAfter }. 429 = rate limit.

  Citations inside any text field: [[file#ref]]
    log line L7 | table row ID | runbook step S2 | rule R2.4

  Severity   = 'P1' | 'P2' | 'P3' | 'P4'
  Evidence   = 'confirmed' | 'suspected' | 'insufficient'
  Claim      = { text, evidence, assumption? }            (assumption required when suspected)
  TimelineEvent = { utc (ISO), text, incidentId }
  AssetRef   = { tag: 'A-1005', role: 'reached' | 'involved' }
  PathEdge   = { from, to, label, utc, evidence }         (from/to = asset tag or 'EXT:ip')
  Incident   = { id, title, severity|null, severityWhy, summary, timeline[], assets[], accounts[],
                 externals[{ip,geo?,note?}], path[], confirmed[], suspected[], insufficient[],
                 actions[{text, runbook, step}], inform[{who, contact?, limitMinutes|null, how}] }
  ReportResponse = { generatedAt, model, overallSeverity, summary, incidents[],
                     missingSources[{name, why}], closedHarmless[{what, changeId, why}] }
  AskResponse = { question, answer, evidence, assumption?, gaps?[] }

  Open the app with ?mock at the end of the URL to use public/mock/*.json with no backend.
*/
import { useCallback, useRef, useState } from 'react'

const BASE = import.meta.env.VITE_API_URL ?? ''

export function useTriage() {
  const [state, setState] = useState({ status: 'idle' })
  const last = useRef(null)

  const run = useCallback(async (kind, question) => {
    last.current = { kind, question }
    setState({ status: 'loading' })
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 90000)
    try {
      const mock = new URLSearchParams(location.search).has('mock')
      let res
      if (mock) {
        await new Promise(r => setTimeout(r, 1500)) // so the loading state can be seen
        res = await fetch(kind === 'ask' ? '/mock/ask.json' : '/mock/report.json')
      } else {
        res = await fetch(`${BASE}/api/${kind}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(kind === 'ask' ? { question } : {}),
          signal: controller.signal
        })
      }

      if (res.status === 429) {
        const body = await res.json().catch(() => ({}))
        setState({ status: 'rate_limited', retryAfter: body.retryAfter ?? 15 })
        return
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message ?? `The server answered ${res.status}.`)
      }
      const data = await res.json()
      if (mock && kind === 'ask') data.question = question
      setState({ status: 'done', kind, data })
    } catch (e) {
      const message = e.name === 'AbortError' ? 'The analysis took longer than 90 seconds.' : e.message
      setState({ status: 'error', message })
    } finally {
      clearTimeout(timer)
    }
  }, [])

  const retry = useCallback(() => {
    if (last.current) run(last.current.kind, last.current.question)
  }, [run])

  return { state, run, retry }
}
