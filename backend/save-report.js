import fs from 'node:fs'
import { validateReport } from './lib/report.js'

const saved = JSON.parse(fs.readFileSync('report-test.json', 'utf8').replace(/^\uFEFF/, ''))
const out = validateReport(saved)
const file = { ...out, generated_at: saved.generated_at ?? new Date().toISOString() }
fs.writeFileSync('saved-report.json', JSON.stringify(file, null, 2))
console.log(`saved-report.json written: ${out.actions.length} actions, ${out.confirmed.length} confirmed, ${out.inform.length} contacts`)