import { validateResult } from './lib/validate.js'

const out = validateResult({
  answer: 'Test answer [[11_vpn_auth_log.md#L7]].',
  claims: [
    { text: 'Four failed MFA pushes then a success. [[11_vpn_auth_log.md#L3]]', label: 'confirmed', citations: ['11_vpn_auth_log.md#L3', '11_vpn_auth_log.md#L7'], assumption: null },
    { text: 'Ayesha clicked the link.', label: 'confirmed', citations: ['17_ids_alert_summary.md#ALT-9002', '11_vpn_auth_log.md#L99'], assumption: 'The connection was a click.' },
    { text: 'No file audit logs exist.', label: 'insufficient', citations: ['20_log_source_coverage.md'], assumption: null },
    { text: 'A made-up claim.', label: 'confirmed', citations: ['11_vpn_auth_log.md#L99'], assumption: null }
  ],
  gaps: ['No file audit logs [[20_log_source_coverage.md]].']
})
console.dir(out, { depth: 5 })