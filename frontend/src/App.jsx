import { useCallback, useEffect, useRef, useState } from 'react'
import { useTriage } from './api/useTriage'
import Landing from './components/Landing'
import TopBar from './components/TopBar'
import Console from './components/Console'
import AnswerPanel from './components/AnswerPanel'
import ReportView from './components/ReportView'
import EvidenceDrawer from './components/EvidenceDrawer'

function useOnline() {
  const [on, setOn] = useState(navigator.onLine)
  useEffect(() => {
    const up = () => setOn(true), down = () => setOn(false)
    window.addEventListener('online', up); window.addEventListener('offline', down)
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down) }
  }, [])
  return on
}

export default function App() {
  const [view, setView] = useState('landing')
  const [zone, setZone] = useState('UTC')
  const [cite, setCite] = useState(null)
  const { state, run, retry } = useTriage()
  const opener = useRef(null)
  const retried = useRef(false)
  const resultRef = useRef(null)
  const online = useOnline()

  const start = useCallback((kind, q) => { retried.current = false; run(kind, q) }, [run])

  // one automatic retry after a rate limit
  useEffect(() => {
    if (state.status === 'rate_limited' && !retried.current) {
      retried.current = true
      const t = setTimeout(retry, state.retryAfter * 1000)
      return () => clearTimeout(t)
    }
  }, [state, retry])

  useEffect(() => {
    if (state.status === 'done') resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [state.status])

  const openCite = (target, el) => { opener.current = el ?? document.activeElement; setCite(target) }
  const closeCite = useCallback(() => { setCite(null); opener.current?.focus?.() }, [])

  if (view === 'landing') {
    return (
      <Landing
        onEnter={() => setView('console')}
        onAnalyze={() => { setView('console'); start('report') }}
      />
    )
  }

  return (
    <>
      <TopBar zone={zone} onZone={setZone} onHome={() => setView('landing')} />
      {!online && <p className="notice top" role="alert">You are offline.</p>}
      <div className="page">
        <Console state={state} onRun={start} onRetry={retry} />

        <div ref={resultRef} className="result">
          {state.status === 'idle' && <p className="muted empty">Nothing to show yet. Ask a question or analyze the full day.</p>}
          {state.status === 'done' && state.kind === 'ask' && <AnswerPanel data={state.data} onCite={openCite} />}
          {state.status === 'done' && state.kind === 'report' && (
            state.data.incidents?.length
              ? <ReportView key={state.data.generatedAt} data={state.data} zone={zone} onCite={openCite} />
              : <p className="panel">The logs show no incidents for the question asked.</p>
          )}
        </div>
      </div>
      <EvidenceDrawer target={cite} onClose={closeCite} />
    </>
  )
}
