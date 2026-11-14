import { askGemini } from './lib/gemini.js'

const result = await askGemini('Reply with JSON only.', 'Return {"ok": true}')
console.log(result)