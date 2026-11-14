export const SHORT = {
  '01_company_security_rules.md': 'Rules',
  '02_asset_inventory.md': 'Assets',
  '03_severity_matrix.md': 'Severity matrix',
  '04_escalation_and_contacts.md': 'Escalation',
  '05_change_calendar.md': 'Changes',
  '06_runbook_phishing.md': 'RB-PHISH-01',
  '07_runbook_credential_compromise.md': 'RB-CRED-02',
  '08_runbook_web_attack.md': 'RB-WEB-03',
  '09_runbook_data_exfiltration.md': 'RB-EXFIL-04',
  '10_runbook_scanning_recon.md': 'RB-SCAN-05',
  '11_vpn_auth_log.md': 'VPN log',
  '12_windows_dc_auth_log.md': 'DC log',
  '13_web_server_log.md': 'Web log',
  '14_firewall_perimeter_log.md': 'Perimeter FW',
  '15_firewall_internal_log.md': 'Internal FW',
  '16_email_gateway_log.md': 'Email log',
  '17_ids_alert_summary.md': 'IDS',
  '18_user_directory.md': 'Users',
  '19_dhcp_lease_log.md': 'DHCP',
  '20_log_source_coverage.md': 'Coverage'
}

// runbook chip name -> file name, used by "Step N of RB-..." chips
export const RUNBOOK_FILE = Object.fromEntries(
  Object.entries(SHORT).filter(([f]) => /^(06|07|08|09|10)_/.test(f)).map(([f, s]) => [s, f])
)

// Fixed facts copied from file 02 (asset inventory)
export const ASSETS = {
  'A-1001': { host: 'SRV-DC01', type: 'Domain controller', criticality: 'Critical', owner: 'IT Infrastructure (Imran Siddiqui)' },
  'A-1005': { host: 'SRV-FS01', type: 'File server', criticality: 'High', owner: 'Finance (Saima Noor)' },
  'A-1007': { host: 'SRV-DB01', type: 'Orders database server', criticality: 'High', owner: 'Applications team' },
  'A-1010': { host: 'SRV-WEB01', type: 'Public web server', criticality: 'Medium', owner: 'Applications team' },
  'A-1012': { host: 'SRV-VPN01', type: 'VPN gateway', criticality: 'Medium', owner: 'IT Infrastructure (Imran Siddiqui)' },
  'A-1020': { host: 'SCAN01', type: 'Vulnerability scanner', criticality: 'Low', owner: 'IT Security' },
  'A-2003': { host: 'LT-IT-003', type: 'Laptop', criticality: 'Medium', owner: 'Bilal Raza' },
  'A-2014': { host: 'LT-FIN-014', type: 'Laptop', criticality: 'Medium', owner: 'Ayesha Malik' },
  'A-2021': { host: 'LT-WH-021', type: 'Laptop', criticality: 'Low', owner: 'Usman Tariq' },
  'A-2022': { host: 'LT-FIN-022', type: 'Laptop', criticality: 'Medium', owner: 'Sadia Raheel' }
}

export const nodeName = id =>
  id?.startsWith('EXT:') ? id.slice(4) : ASSETS[id] ? `${ASSETS[id].host} (${id})` : id
