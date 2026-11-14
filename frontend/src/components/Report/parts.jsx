import { RichText } from '../Citation'

export const SeverityChip = ({ level }) => (
  <span className={`sev sev-${level ?? 'closed'}`}>{level ?? 'Closed'}</span>
)

const LABEL = {
  confirmed: 'Confirmed',
  suspected: 'Suspected',
  insufficient: 'Not enough evidence in the logs'
}

// Icon + word, so the three labels differ by shape and border style, not colour alone.
export const Evidence = ({ kind }) => (
  <span className={`ev-label ${kind}`}>
    <span className={`box ${kind}`} aria-hidden="true" />
    <span className="sr-only">{LABEL[kind]}: </span>
  </span>
)

export function ClaimList({ kind, claims, multi, onCite }) {
  return (
    <section className={`rsec claims ${kind}`} aria-labelledby={`h-${kind}`}>
      <h2 id={`h-${kind}`}>{LABEL[kind]}</h2>
      {claims.length === 0 && <p className="muted">Nothing in this group.</p>}
      <ul className="plain">
        {claims.map((c, i) => (
          <li key={i} className={`claim ${kind}`}>
            <Evidence kind={kind} />
            <div>
              {multi && <span className="inc-tag">{c.incId}</span>}
              <p><RichText text={c.text} onCite={onCite} /></p>
              {kind === 'suspected' && c.assumption && (
                <p className="assumption">Assumption: <RichText text={c.assumption} onCite={onCite} /></p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
