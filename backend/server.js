import express from 'express'
import cors from 'cors'
import fs from 'node:fs'
import path from 'node:path'
import { buildCorpus, DATA, FILES } from './lib/corpus.js'
import { askGemini } from './lib/gemini.js'
import { ASK_SYSTEM } from './lib/prompts.js'

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
    console.log(`ask ok in ${Date.now() - started}ms`)
    res.json({ question, ...result })
  } catch (e) {
    console.error(`ask failed in ${Date.now() - started}ms: ${e.message}`)
    res.status(e.status ?? 500).json({ message: e.message, retryAfter: e.retryAfter })
  }
})

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