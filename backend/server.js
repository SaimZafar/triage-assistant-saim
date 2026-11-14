import express from 'express'
import cors from 'cors'
import fs from 'node:fs'
import path from 'node:path'
import { buildCorpus, DATA, FILES } from './lib/corpus.js'
import { askGemini } from './lib/gemini.js'
import { ASK_SYSTEM } from './lib/prompts.js'
import { validateResult } from './lib/validate.js'
import { REPORT_SYSTEM, validateReport } from './lib/report.js'

if (!process.env.GEMINI_API_KEY) {
  console.error('Missing GEMINI_API_KEY. Put it in backend/.env or in the host settings.')
  process.exit(1)
}

const CORPUS = buildCorpus()
const MAX_QUESTION = 2000

const app = express()
app.use(cors())
app.use(express.json({ limit: '100kb' }))

app.get('/api/health', (req, res) => res.json({ ok: true }))

app.get('/api/files', (req, res) => res.json({ files: FILES }))

app.get('/api/files/:name', (req, res) => {
  const name = req.params.name
  if (!FILES.includes(name)) return res.status(404).json({ message: 'File not found' })
  res.json({ name, content: fs.readFileSync(path.join(DATA, name), 'utf8') })
})

app.post('/api/ask', async (req, res) => {
  const question = String(req.body?.question ?? '').trim()
  if (!question) return res.status(400).json({ message: 'Send a question.' })
  if (question.length > MAX_QUESTION) {
    return res.status(400).json({ message: `Question is too long (max ${MAX_QUESTION} characters).` })
  }

  const started = Date.now()
  try {
    const result = await askGemini(ASK_SYSTEM, `FILES:\n${CORPUS}\n\nQUESTION: ${question}`)
    const checked = validateResult(result)
    console.log(`ask ok in ${Date.now() - started}ms, ${checked.removedCitations.length} citation(s) removed`)
    res.json({ question, ...checked })
  } catch (e) {
    console.error(`ask failed in ${Date.now() - started}ms: ${e.message}`)
    res.status(e.status ?? 500).json({ message: e.message, retryAfter: e.retryAfter })
  }
})

// The report is built from the same 20 files every time, so it is generated once and kept in memory.
// Add ?refresh=1 to build it again. Requests that arrive while it is being built share the same call.
// A report that fails the quality check below is never cached, so the last good report stays.
let reportCache = null
let reportPending = null

// A usable report has a timeline, confirmed claims, actions and contacts.
// If the model skipped the citation format, the validator drops them all and one of these is empty.
function reportProblems(report) {
  const problems = []
  if (report.timeline.length === 0) problems.push('no timeline')
  if (report.confirmed.length === 0) problems.push('no confirmed claims')
  if (report.actions.length === 0) problems.push('no actions')
  if (report.inform.length === 0) problems.push('no contacts')
  return problems
}

async function buildReport() {
  const started = Date.now()

  for (let attempt = 1; attempt <= 2; attempt++) {
    // only the main model: the backup models follow the citation rules less well
    const raw = await askGemini(REPORT_SYSTEM, `FILES:\n${CORPUS}\n\nWrite the incident report.`, {
      timeoutMs: 150_000,
      maxOutputTokens: 32768,
      primaryOnly: true,
      rounds: 6
    })

    const checked = validateReport(raw)
    const problems = reportProblems(checked)

    if (problems.length === 0) {
      console.log(
        `report ok in ${Date.now() - started}ms, ${checked.removedCitations.length} citation(s) removed, ${checked.notes.length} note(s)`
      )
      return { ...checked, generated_at: new Date().toISOString() }
    }

    console.warn(`report attempt ${attempt} rejected: ${problems.join(', ')}`)
  }

  throw Object.assign(new Error('The report came back incomplete. Try again.'), { status: 502, retryAfter: 15 })
}

async function reportHandler(req, res) {
  if (reportCache && req.query.refresh !== '1') return res.json({ ...reportCache, cached: true })

  try {
    if (!reportPending) {
      reportPending = buildReport().finally(() => {
        reportPending = null
      })
    }
    reportCache = await reportPending
    res.json({ ...reportCache, cached: false })
  } catch (e) {
    console.error(`report failed: ${e.message}`)
    // keep serving the last good report if there is one
    if (reportCache) return res.json({ ...reportCache, cached: true, stale: true })
    res.status(e.status ?? 500).json({ message: e.message, retryAfter: e.retryAfter })
  }
}

app.route('/api/report').get(reportHandler).post(reportHandler)

app.use((req, res) => res.status(404).json({ message: 'Not found' }))

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Body is not valid JSON.' })
  }
  console.error(err)
  res.status(500).json({ message: 'Server error.' })
})

const port = process.env.PORT || 8000
app.listen(port, () => console.log(`Backend running on port ${port}`))