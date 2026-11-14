// Models are tried in this order. Override with GEMINI_MODELS in .env, for example:
// GEMINI_MODELS=gemini-2.5-flash,gemini-3.5-flash-lite
const DEFAULT_MODELS = ['gemini-2.5-flash', 'gemini-3.5-flash-lite']
const MODELS = (process.env.GEMINI_MODELS ?? '')
  .split(',')
  .map(m => m.trim())
  .filter(Boolean)
const MODEL_LIST = MODELS.length ? MODELS : DEFAULT_MODELS

const DEFAULT_ROUNDS = 4
const DEFAULT_TIMEOUT_MS = 60_000

const wait = ms => new Promise(r => setTimeout(r, ms))

// options.timeoutMs: per-request timeout (the full report needs longer than a short question)
// options.maxOutputTokens: upper limit for the reply
// options.primaryOnly: use only the first model (the backup models follow instructions less well)
// options.rounds: how many times to go through the model list before giving up
export async function askGemini(
  system,
  user,
  { timeoutMs = DEFAULT_TIMEOUT_MS, maxOutputTokens, primaryOnly = false, rounds = DEFAULT_ROUNDS } = {}
) {
  const models = primaryOnly ? MODEL_LIST.slice(0, 1) : MODEL_LIST
  let lastStatus = 502
  const dead = new Set() // models that answered 404: never call them again in this request

  for (let round = 0; round < rounds; round++) {
    for (const model of models) {
      if (dead.has(model)) continue
      const tag = `[gemini] ${model} round ${round + 1}/${rounds}`
      let res

      try {
        res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: 'POST',
            headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(timeoutMs),
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: system }] },
              contents: [{ role: 'user', parts: [{ text: user }] }],
              generationConfig: {
                temperature: 0.1,
                responseMimeType: 'application/json',
                ...(maxOutputTokens ? { maxOutputTokens } : {})
              }
            })
          }
        )
      } catch (e) {
        console.warn(`${tag}: network error or timeout (${e.name}: ${e.message})`)
        lastStatus = 504
        continue
      }

      if (res.ok) {
        const data = await res.json()
        const candidate = data.candidates?.[0]
        const text = candidate?.content?.parts?.map(p => p.text ?? '').join('') ?? ''

        try {
          const parsed = JSON.parse(text)
          console.log(`${tag}: answered`)
          return parsed
        } catch {
          console.warn(
            `${tag}: reply is not valid JSON (finishReason=${candidate?.finishReason ?? 'none'}, ` +
              `length=${text.length}, blockReason=${data.promptFeedback?.blockReason ?? 'none'}, ` +
              `outputTokens=${data.usageMetadata?.candidatesTokenCount ?? '?'}, ` +
              `thinkingTokens=${data.usageMetadata?.thoughtsTokenCount ?? '?'})`
          )
          lastStatus = 502
          continue
        }
      }

      lastStatus = res.status
      const errBody = await res.json().catch(() => ({}))
      console.warn(`${tag}: HTTP ${res.status} ${errBody.error?.status ?? ''} ${errBody.error?.message ?? ''}`.trim())

      if (res.status === 404) {
        dead.add(model)
        continue
      }

      if (res.status === 429 || res.status >= 500) continue

      // a bad key or a bad request will not get better by retrying
      throw Object.assign(new Error(errBody.error?.message ?? `Gemini error ${res.status}`), { status: res.status })
    }

    if (dead.size === models.length) break
    if (round < rounds - 1) await wait(Math.min(3000 * 2 ** round, 15_000)) // 3s, 6s, 12s, 15s
  }

  const rateLimited = lastStatus === 429
  const busy = lastStatus === 503

  throw Object.assign(
    new Error(
      rateLimited
        ? 'The model is rate limited. Try again shortly.'
        : busy
          ? 'The model is busy right now. Try again shortly.'
          : 'The model could not answer. Try again.'
    ),
    { status: rateLimited ? 429 : busy ? 503 : 502, retryAfter: 15 }
  )
}