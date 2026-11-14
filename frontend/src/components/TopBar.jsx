import { fx } from '../lib/fx'
import Safe from './Safe'

export default function TopBar({ zone, onZone, onHome }) {
  const Glass = fx('GlassSurface')

  const content = (
    <div className="bar-inner">
      <button type="button" className="brand" onClick={onHome}>Orbit Logistics triage</button>
      <div className="zone" role="group" aria-label="Time zone">
        <button type="button" aria-pressed={zone === 'UTC'} onClick={() => onZone('UTC')}>UTC</button>
        <span aria-hidden="true">|</span>
        <button type="button" aria-pressed={zone === 'PKT'} onClick={() => onZone('PKT')}>PKT</button>
      </div>
    </div>
  )

  const plain = <div className="bar plain-glass">{content}</div>

  return (
    <header className="bar-wrap">
      {Glass ? (
        <Safe fallback={plain}>
          <Glass width="100%" height={56} borderRadius={28} distortionScale={-60} displace={0.3} backgroundOpacity={0.45}>
            {content}
          </Glass>
        </Safe>
      ) : plain}
    </header>
  )
}