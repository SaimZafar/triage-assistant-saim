import express from 'express'
import cors from 'cors'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA = path.join(__dirname, '..', 'problem_c_data')
const FILES = fs.readdirSync(DATA).filter(f => f.endsWith('.md'))

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => res.json({ ok: true }))

app.get('/api/files/:name', (req, res) => {
  const name = req.params.name
  if (!FILES.includes(name)) return res.status(404).json({ message: 'File not found' })
  res.json({ name, content: fs.readFileSync(path.join(DATA, name), 'utf8') })
})

const port = process.env.PORT || 8000
app.listen(port, () => console.log(`Backend running on port ${port}`))