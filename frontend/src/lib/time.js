const FIVE_HOURS = 5 * 3600 * 1000

export const utcClock = iso => new Date(iso).toISOString().slice(11, 19)
export const pktClock = iso => new Date(new Date(iso).getTime() + FIVE_HOURS).toISOString().slice(11, 19)

// minutes since 00:00 UTC on the incident day, used by the time scrubber
export const minutesOfDay = iso => {
  const d = new Date(iso)
  return d.getUTCHours() * 60 + d.getUTCMinutes()
}

export const clockFromMinutes = m =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

// zone is 'UTC' or 'PKT'. Main time first, the other in brackets.
export function stamp(iso, zone) {
  const main = zone === 'PKT' ? `${pktClock(iso)} PKT` : `${utcClock(iso)} UTC`
  const other = zone === 'PKT' ? `${utcClock(iso)} UTC` : `${pktClock(iso)} PKT`
  return { main, other }
}
