import { useEffect, useRef, useState } from 'react'
import { parseSource } from '../lib/parseSource'
import { loadFile } from '../lib/files'
import { SHORT } from '../lib/sources'

export default function EvidenceDrawer({ target, onClose }) {
  const [parsed, setParsed] = useState(null)
  const [error, setError] = useState(null)
  const hit = useRef(null)

  useEffect(() => {
    if (!target) return
    setParsed(null); setError(null)
    loadFile(target.file)
      .then(f => setParsed(parseSource(target.file, f.content)))
      .catch(e => setError(e.message))
  }, [target])

  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    hit.current?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
  }, [parsed])

  useEffect(() => {
    if (!target) return
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [target, onClose])

  if (!target) return null
  const same = (a, b) => a && b && a.toLowerCase() === b.toLowerCase()
  const found = parsed?.rows.some(r => same(r.key, target.ref))

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={`Evidence: ${SHORT[target.file] ?? target.file}`}>
        <header>
          <strong>{SHORT[target.file] ?? target.file}</strong>
          <code>{target.file}</code>
          <button type="button" className="secondary" onClick={onClose} autoFocus>Close</button>
        </header>
        {error && <p className="notice" role="alert">{error}</p>}
        {!parsed && !error && <p className="muted">Loading file.</p>}
        {parsed && !found && <p className="notice" role="alert">This reference was not found in the file.</p>}
        {parsed && (
          <pre className="logblock">
            {parsed.rows.map((r, i) => {
              const isHit = same(r.key, target.ref)
              return (
                <div key={i} ref={isHit ? hit : null} className={isHit ? 'row hit' : 'row'}>
                  <span className="n">{r.label}</span>{r.text}
                </div>
              )
            })}
          </pre>
        )}
      </aside>
    </>
  )
}
