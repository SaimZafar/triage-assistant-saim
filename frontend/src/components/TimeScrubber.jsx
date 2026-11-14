import { fx } from '../lib/fx'
import Safe from './Safe'
import { clockFromMinutes } from '../lib/time'

export default function TimeScrubber({ minutes, onChange }) {
  const Dial = fx('CometDial')
  const slider = (visible) => (
    <input
      type="range" min={0} max={1440} step={15}
      value={minutes}
      onChange={e => onChange(Number(e.target.value))}
      aria-label="Time of day in UTC"
      className={visible ? 'range' : 'sr-only'}
    />
  )

  return (
    <div className="scrubber">
      {Dial ? (
        <Safe fallback={slider(true)}>
          <Dial
            defaultValue={96} min={0} max={96} step={1} unit="" label="UTC"
            accent="#EEF2F5" ink="#EEF2F5" size={200} sweep={320} thickness={5} speed={25}
            tapBounce={0.2} flickBounce={0.1} momentum={1} cometReach={180} cometWidth={12}
            onChange={v => onChange(v * 15)} onChangeEnd={v => onChange(v * 15)}
          />
          {slider(false)}
        </Safe>
      ) : slider(true)}
      <output className="clock" aria-live="polite">
        {minutes >= 1440 ? 'Whole day' : `${clockFromMinutes(minutes)} UTC`}
      </output>
      <button type="button" className="link" onClick={() => onChange(1440)} disabled={minutes >= 1440}>Show the whole day</button>
    </div>
  )
}
