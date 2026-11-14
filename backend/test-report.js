import { validateReport } from './lib/report.js'

const out = validateReport({
  summary: 'Test summary [[11_vpn_auth_log.md#L7]].',
  timeline: [
    { time_utc: '2026-11-04T05:49:12Z', event: 'VPN login from RO.', citations: ['11_vpn_auth_log.md#L7'] },
    { time_utc: '2026-11-04T03:10:05Z', event: 'Port scan begins.', citations: ['14_firewall_perimeter_log.md#L1'] },
    { time_utc: '2026-11-04T09:00:00Z', event: 'Uncited event.', citations: ['11_vpn_auth_log.md#L99'] }
  ],
  severity: [
    { incident: 'A', type: 'Credential compromise', asset: 'SRV-FS01', criticality: 'High', severity: 'P2', steps: ['x'], citations: ['02_asset_inventory.md#A-1005'] },
    { incident: 'B', type: 'Scanning', asset: 'SRV-WEB01', criticality: 'Medium', severity: 'P4', steps: [], citations: [] }
  ],
  overall_severity: 'P4',
  confirmed: [
    { text: 'Real claim.', citations: ['11_vpn_auth_log.md#L7'] },
    { text: 'Unsupported claim.', citations: ['11_vpn_auth_log.md#L99'] }
  ],
  suspected: [{ text: 'Guess.', assumption: 'It was a click.', citations: ['17_ids_alert_summary.md#ALT-9002'] }],
  insufficient: [{ text: 'No audit log.', citations: ['20_log_source_coverage.md'] }],
  missing_sources: ['SRV-FS01 audit log [[20_log_source_coverage.md]].'],
  closed_harmless: [
    { activity: 'Nightly scan', change_id: 'CHG-2026-1104-02', reason: 'Inside window.', citations: [] },
    { activity: 'Mystery change', change_id: 'CHG-9999', reason: 'Approved.', citations: [] }
  ],
  actions: [
    { incident: 'A', text: 'Disable the account.', runbook: 'wrong', step: 9, citations: ['07_runbook_credential_compromise.md#S2'] },
    { incident: 'A', text: 'Invented action.', runbook: 'RB-X', step: 1, citations: [] }
  ],
  inform: [
    { incident: 'A', name: 'Noman Javed', role: 'Security Manager', time_limit: '1 hour', citations: ['04_escalation_and_contacts.md#P2'] },
    { incident: 'A', name: 'Nobody', role: 'x', time_limit: '1 hour', citations: [] }
  ]
})
console.dir(out, { depth: 5 })