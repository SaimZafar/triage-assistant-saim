import { useEffect, useState } from 'react'
import { fx } from '../lib/fx'
import Safe from './Safe'

const PRESETS = [
  'Summarize every incident',
  'Was the VPN login from Romania really Ayesha?',
  'Which scans were approved?',
  'How much data left the file server?',
  'Which log sources are missing?'
]

function Countdown({ from }) {
  const [left, setLeft] = useState(from)
  useEffect(() => {
    setLeft(from)
    const t = setInterval(() => setLeft(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [from])
  return <>{left}</>
}

export default function Console({ state, onRun, onRetry }) {
  const [question, setQuestion] = useState('')
  const busy = state.status === 'loading'
  const TrueFocus = fx('TrueFocus')

  const plainLoader = <p className="pulse">Reading logs. Aligning clocks. Matching runbooks.</p>

  return (
    <section className="console" aria-labelledby="q-label">
      <form
        onSubmit={e => { e.preventDefault(); if (question.trim()) onRun('ask', question.trim()) }}
        data-testid="question-form"
      >
        <h1 id="q-label"><label htmlFor="q">Ask about 4 Nov 2026</label></h1>
        <textarea
          id="q" name="question" rows={3}
          data-testid="question-input"
          placeholder="Which accounts were affected, and how do you know?"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              if (question.trim() && !busy) onRun('ask', question.trim())
            }
          }}
          disabled={busy}
        />
        <div className="row">
          <button type="submit" className="secondary" disabled={busy || !question.trim()} data-testid="ask-button">Ask a question</button>
          <button type="button" className="primary" disabled={busy} onClick={() => onRun('report')} data-testid="report-button">
            Analyze the full day
          </button>
        </div>
      </form>

      <div className="chips">
        {PRESETS.map((p, i) => (
          <button key={p} type="button" className="chip" disabled={busy}
            onClick={() => { setQuestion(p); onRun(i === 0 ? 'report' : 'ask', p) }}>
            {p}
          </button>
        ))}
      </div>

      <p className="footnote">Grounded in 20 files. No outside knowledge.</p>

      {busy && (
        <div role="status" aria-live="polite" className="loading">
          {TrueFocus ? (
            <Safe fallback={plainLoader}>
              <TrueFocus
                sentence="Reading logs aligning clocks matching runbooks"
                manualMode={false} focusStyle="brackets" easing="smooth" order="sequential"
                blurAmount={5} focusScale={1} unfocusedOpacity={1}
                borderColor="#5FC8C2" cornerSize={16} borderWidth={3}
                animationDuration={0.5} pauseBetweenAnimations={1}
              />
            </Safe>
          ) : plainLoader}
        </div>
      )}

      {state.status === 'rate_limited' && (
        <p className="notice" role="alert">
          The model is busy. Trying again in <Countdown from={state.retryAfter} /> seconds.
        </p>
      )}
      {state.status === 'error' && (
        <div className="notice" role="alert">
          <p>The analysis did not finish. {state.message} Check that the backend is running, then try again.</p>
          <button type="button" className="secondary" onClick={onRetry}>Try again</button>
        </div>
      )}
    </section>
  )
}