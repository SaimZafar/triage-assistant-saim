import { validateResult } from './lib/validate.js'

const out = validateResult({
  answer: 'Lockout [[12_windows_dc_auth_log.md#L7-L9]] and a bad one [[11_vpn_auth_log.md#L99]].',
  evidence: 'confirmed',
  assumption: 'Ayesha clicked the link.',
  citations: ['11_vpn_auth_log.md#L99', '20_log_source_coverage.md']
})
console.log(out)