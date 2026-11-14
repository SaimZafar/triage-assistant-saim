import { useRef } from 'react'
import { fx } from '../lib/fx'
import Safe from './Safe'

const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

export default function Landing({ onEnter, onAnalyze }) {
  const cardRef = useRef(null)
  const Laser = calm ? null : fx('LaserFlow')
  const Fold = calm ? null : fx('FoldText')

  const plainHeading = <h1 className="hero">Every claim, cited.</h1>

  return (
    <main className="landing">
      {Laser && (
        <div className="beam" aria-hidden="true">
          <Safe fallback={null}>
            <Laser
              surfaceRef={cardRef}
              beamPosition={0.5}
              color="#5FC8C2"
              intensity={1.1}
              flare={0.8}
              spread={1.5}
              spill={1}
              fog={0.2}
              dust={1.6}
            />
          </Safe>
        </div>
      )}

      <div className="landing-top">
        <span className="brand-static">Orbit Logistics triage</span>
        <button type="button" className="link" onClick={onEnter}>Skip intro</button>
      </div>

      <div className="landing-body">
        {Fold ? (
          <Safe fallback={plainHeading}>
            <h1 className="hero" aria-label="Every claim, cited.">
              <Fold
                text="Every claim, cited."
                foldStyle="paper" splitBy="char" hinge="top" trigger="mount"
                foldAngle={92} duration={0.65} stagger={0.045} staggerFrom="start" ease="power3.out"
                hoverRefold={true} refoldRadius={140} refoldAngle={45} perspective={700} creaseShading={0.55}
                fontSize="clamp(3rem, 10vw, 7rem)" fontWeight={800}
              />
            </h1>
          </Safe>
        ) : plainHeading}

        <p className="sub">
          Ask about the 4 Nov 2026 logs from Orbit Logistics. Answers use only the 20 files in the data pack.
        </p>

        <div className="landing-card" ref={cardRef}>
          <button type="button" className="primary" onClick={onAnalyze}>Analyze the full day</button>
          <button type="button" className="secondary" onClick={onEnter}>Ask a question</button>
        </div>
      </div>
    </main>
  )
}
