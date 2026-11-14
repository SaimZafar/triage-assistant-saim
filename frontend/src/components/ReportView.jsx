import { useMemo, useState } from 'react'
import { RichText } from './Citation'
import { SeverityChip, ClaimList, Evidence } from './Report/parts'
import TimeScrubber from './TimeScrubber'
import { ASSETS, RUNBOOK_FILE, nodeName } from '../lib/sources'
import { minutesOfDay, stamp } from '../lib/time'

const ORDER = ['P1', 'P2', 'P3', 'P4']

export default function ReportView({ data, zone, onCite }) {
  const [selected, setSelected] = useState(null) // incident id or null
  const [at, setAt] = useState(1440)             // minutes since 00:00 UTC; 1440 = whole day

  const picked = selected ? data.incidents.filter(i => i.id === selected) : data.incidents
  const multi = picked.length > 1
  const tag = key => picked.flatMap(i => (i[key] ?? []).map(x => ({ ...x, incId: i.id })))

  const timeline = useMemo(
    () => tag('timeline').sort((a, b) => a.utc.localeCompare(b.utc)),
    [selected, data]
  )
  const path = tag('path').filter(e => minutesOfDay(e.utc) <= at).sort((a, b) => a.utc.localeCompare(b.utc))

  // assets: one row per tag, "reached" wins over "involved"
  const assets = useMemo(() => {
    const map = new Map()
    picked.flatMap(i => i.assets ?? []).forEach(a => {
      if (!map.has(a.tag) || a.role === 'reached') map.set(a.tag, a)
    })
    return [...map.values()]
  }, [selected, data])
  const accounts = [...new Set(picked.flatMap(i => i.accounts ?? []))]
  const externals = picked.flatMap(i => i.externals ?? [])

  const stats = useMemo(() => {
    const files = new Set([...JSON.stringify(data).matchAll(/\[\[([^\]#]+)#/g)].map(m => m[1]))
    const deadlines = picked.flatMap(i => i.inform ?? []).map(p => p.limitMinutes).filter(n => n != null)
    return {
      files: files.size,
      deadline: deadlines.length ? `${Math.min(...deadlines)} minutes` : 'None'
    }
  }, [selected, data])

  const highest = ORDER.find(p => picked.some(i => i.severity === p)) ?? '–'
  const closed = data.closedHarmless ?? []

  return (
    <div className="report" data-testid="report">
      <div className="banner panel">
        <SeverityChip level={data.overallSeverity} />
        <p>
          {data.incidents.length} {data.incidents.length === 1 ? 'incident' : 'incidents'}, {closed.length} closed as harmless
        </p>
      </div>

      <div className="stats">
        <Stat n={picked.length} label="Incidents found" />
        <Stat n={highest} label="Highest severity" />
        <Stat n={stats.files} label="Sources used" />
        <Stat n={data.missingSources?.length ?? 0} label="Missing sources" />
        <Stat n={closed.length} label="Closed as harmless" />
        <Stat n={stats.deadline} label="Nearest call deadline" />
      </div>

      <div className="cards">
        {data.incidents.map(inc => (
          <button
            key={inc.id} type="button"
            className={`icard panel ${inc.severity === 'P1' ? 'p1' : ''} ${selected === inc.id ? 'on' : ''}`}
            aria-pressed={selected === inc.id}
            onClick={() => setSelected(selected === inc.id ? null : inc.id)}
          >
            <span className="icard-top"><SeverityChip level={inc.severity} /> <code>{inc.id}</code></span>
            <span className="icard-title">{inc.title}</span>
          </button>
        ))}
        {closed.map(c => (
          <div key={c.changeId} className="icard panel closed">
            <span className="icard-top"><SeverityChip level={null} /> <code>{c.changeId}</code></span>
            <span className="icard-title">{c.what}</span>
          </div>
        ))}
      </div>
      {selected && (
        <button type="button" className="link" onClick={() => setSelected(null)}>Show all incidents</button>
      )}

      <div className="cols">
        <div className="left">
          <section className="rsec" aria-labelledby="h-summary">
            <h2 id="h-summary">Summary</h2>
            {!selected && <p className="body"><RichText text={data.summary} onCite={onCite} /></p>}
            {picked.map(i => (
              <p key={i.id} className="body">
                {multi && <span className="inc-tag">{i.id}</span>}
                <RichText text={i.summary} onCite={onCite} />
              </p>
            ))}
          </section>

          <section className="rsec" aria-labelledby="h-timeline">
            <h2 id="h-timeline">Timeline ({zone})</h2>
            <ol className="plain">
              {timeline.map((ev, i) => {
                const t = stamp(ev.utc, zone)
                return (
                  <li key={i} className={minutesOfDay(ev.utc) > at ? 'ev later' : 'ev'}>
                    <time dateTime={ev.utc}>{t.main} <span className="muted">[{t.other}]</span></time>
                    <p>{multi && <span className="inc-tag">{ev.incId}</span>}<RichText text={ev.text} onCite={onCite} /></p>
                  </li>
                )
              })}
            </ol>
          </section>

          <section className="rsec" aria-labelledby="h-assets">
            <h2 id="h-assets">Affected assets and accounts</h2>
            <div className="scroll-x">
              <table>
                <thead><tr><th>Asset</th><th>Role</th><th>Criticality</th><th>Owner</th></tr></thead>
                <tbody>
                  {assets.map(a => (
                    <tr key={a.tag}>
                      <td><code>{ASSETS[a.tag]?.host ?? a.tag}</code> <span className="muted">{a.tag}</span></td>
                      <td>{a.role === 'reached' ? 'Reached' : 'Involved'}</td>
                      <td>{ASSETS[a.tag]?.criticality ?? ''}</td>
                      <td>{ASSETS[a.tag]?.owner ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {accounts.length > 0 && <p className="body">Accounts: {accounts.map(a => <code key={a} className="pill">{a}</code>)}</p>}
            {externals.length > 0 && (
              <ul className="plain">
                {externals.map((x, i) => (
                  <li key={i} className="body"><code>{x.ip}</code>{x.geo ? ` (${x.geo})` : ''}{x.note ? `, ${x.note}` : ''}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="rsec" aria-labelledby="h-severity">
            <h2 id="h-severity">Severity</h2>
            {picked.map(i => (
              <div key={i.id} className="sev-row">
                <p><SeverityChip level={i.severity} /> <strong>{i.id}</strong> {i.title}</p>
                <p className="body"><RichText text={i.severityWhy} onCite={onCite} /></p>
              </div>
            ))}
          </section>

          <ClaimList kind="confirmed" claims={tag('confirmed')} multi={multi} onCite={onCite} />
          <ClaimList kind="suspected" claims={tag('suspected')} multi={multi} onCite={onCite} />
          <ClaimList kind="insufficient" claims={tag('insufficient')} multi={multi} onCite={onCite} />

          <section className="rsec" aria-labelledby="h-missing">
            <h2 id="h-missing">Missing log sources</h2>
            {(data.missingSources ?? []).length === 0 && <p className="muted">Nothing in this group.</p>}
            <ul className="plain">
              {(data.missingSources ?? []).map((m, i) => (
                <li key={i} className="claim insufficient"><Evidence kind="insufficient" /><p><strong>{m.name}.</strong> {m.why}</p></li>
              ))}
            </ul>
          </section>

          <section className="rsec" aria-labelledby="h-closed">
            <h2 id="h-closed">Closed as harmless</h2>
            {closed.length === 0 && <p className="muted">Nothing in this group.</p>}
            <ul className="plain">
              {closed.map(c => (
                <li key={c.changeId} className="closed-row">
                  <p><strong>{c.what}</strong> <code className="pill">{c.changeId}</code></p>
                  <p className="body"><RichText text={c.why} onCite={onCite} /></p>
                </li>
              ))}
            </ul>
          </section>

          <section className="rsec" aria-labelledby="h-actions">
            <h2 id="h-actions">Recommended actions</h2>
            <ol className="plain">
              {tag('actions').map((a, i) => (
                <li key={i} className="action">
                  {multi && <span className="inc-tag">{a.incId}</span>}
                  Step {a.step} of{' '}
                  <button
                    type="button" className="cite"
                    onClick={e => RUNBOOK_FILE[a.runbook] && onCite({ file: RUNBOOK_FILE[a.runbook], ref: `S${a.step}` }, e.currentTarget)}
                  >{a.runbook}</button>: {a.text}
                </li>
              ))}
            </ol>
          </section>

          <section className="rsec" aria-labelledby="h-inform">
            <h2 id="h-inform">People to inform</h2>
            <ul className="plain">
              {tag('inform').map((p, i) => (
                <li key={i} className="inform">
                  {multi && <span className="inc-tag">{p.incId}</span>}
                  <strong>{p.who}</strong>, {p.limitMinutes != null ? `within ${p.limitMinutes} minutes` : 'no call deadline'}. {p.how}.
                  {p.contact && <> <code className="pill">{p.contact}</code></>}
                </li>
              ))}
            </ul>
            <p className="muted small">
              <RichText text="The clock starts when the SOC first sees the incident. [[01_company_security_rules.md#R5.2]]" onCite={onCite} />
            </p>
          </section>
        </div>

        <aside className="right">
          <div className="panel">
            <h2>Attack path</h2>
            <p className="muted small">Solid lines are confirmed. Dashed lines are suspected.</p>
            <ol className="plain path">
              {path.length === 0 && <li className="muted">No steps by this time.</li>}
              {path.map((e, i) => (
                <li key={i} className={`edge ${e.evidence}`}>
                  <time className="mono small">{stamp(e.utc, zone).main}</time>
                  <span><code>{nodeName(e.from)}</code> to <code>{nodeName(e.to)}</code></span>
                  <span className="muted">{e.label}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="panel">
            <h2>Time of day</h2>
            <TimeScrubber minutes={at} onChange={setAt} />
          </div>
        </aside>
      </div>
    </div>
  )
}

const Stat = ({ n, label }) => (
  <div className="stat panel"><strong>{n}</strong><span>{label}</span></div>
)
