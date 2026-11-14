/*
  Contract with the backend (Saim). Plain JavaScript, so the shapes live here as a comment.

  POST /api/report  body {}                    -> ReportResponse
  POST /api/ask     body { question }          -> AskResponse
  GET  /api/files/:name                        -> { name, content }
  GET  /api/health                             -> { ok: true }
  Errors: normal HTTP status + { message, retryAfter }. 429 = rate limit.

  Citations inside any text field: [[file#ref]]
    log line L7 | table row ID | runbook step S2 | rule R2.4

  AskResponse = { question, answer, evidence, assumption?, gaps?[] }

  The real backend returns citations as a separate array and has no tags in the text,
  so adaptAsk() below turns the backend shape into the AskResponse shape.

  Open the app with ?mock at the end of the URL to use public/mock/*.json with no backend.
*/
import { useCallback, useRef, useState } from 'react'

const BASE = import.meta.env.VITE_API_URL ?? ''

// Backend: { answer, claims[{text,label,citations,assumption}], evidence, assumption, citations[], gaps[] }
// Frontend: answer text with [[file#ref]] tags, plus gaps shown as "not enough evidence".
function adaptAsk(data) {
  const tags = (data.citations ?? []).map(c => `[[${c}]]`).join(' ')
  const missing = (data.claims ?? []).filter(c => c.label === 'insufficient').map(c => c.text)
  const gaps = [...new Set([...(data.gaps ?? []), ...missing])]
  return {
    ...data,
    answer: `${data.answer ?? ''} ${tags}`.trim(),
    gaps
  }
}

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
      let data = await res.json()
      if (mock && kind === 'ask') data.question = question
      if (!mock && kind === 'ask') data = adaptAsk(data)
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