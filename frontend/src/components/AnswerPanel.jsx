import { RichText } from './Citation'
import { Evidence } from './Report/parts'

export default function AnswerPanel({ data, onCite }) {
  return (
    <section className="panel answer" aria-label="Answer">
      <p className="muted q">{data.question}</p>
      <div className={`claim ${data.evidence}`}>
        <Evidence kind={data.evidence} />
        <div>
          <p><RichText text={data.answer} onCite={onCite} /></p>
          {data.evidence === 'suspected' && data.assumption && (
            <p className="assumption">Assumption: {data.assumption}</p>
          )}
        </div>
      </div>
      {data.gaps?.length > 0 && (
        <>
          <h2>Not enough evidence in the logs</h2>
          <ul className="plain">
            {data.gaps.map((g, i) => (
              <li key={i} className="claim insufficient"><Evidence kind="insufficient" /><p>{g}</p></li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
