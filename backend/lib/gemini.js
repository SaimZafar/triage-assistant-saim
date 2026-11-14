const MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite']
const DEFAULT_TIMEOUT_MS = 60_000
const wait = ms => new Promise(r => setTimeout(r, ms))

// options.timeoutMs: per-request timeout (the full report needs longer than a short question)
// options.maxOutputTokens: upper limit for the reply
export async function askGemini(system, user, { timeoutMs = DEFAULT_TIMEOUT_MS, maxOutputTokens } = {}) {
  let lastStatus = 502

  for (const model of MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
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
      } catch {
        // network error or timeout: retry
        lastStatus = 504
        await wait(1500 * (attempt + 1))
        continue
      }

      if (res.ok) {
        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? ''
        try {
          return JSON.parse(text)
        } catch {
          lastStatus = 502 // not valid JSON (or cut off): retry
          continue
        }
      }

      lastStatus = res.status
      if (res.status === 429 || res.status >= 500) {
        await wait(1500 * (attempt + 1))
        continue
      }
      if (res.status === 404) break // model name not available: try the next model

      const body = await res.json().catch(() => ({}))
      throw Object.assign(new Error(body.error?.message ?? `Gemini error ${res.status}`), { status: res.status })
    }
  }

  const rateLimited = lastStatus === 429
  throw Object.assign(
    new Error(rateLimited ? 'The model is rate limited. Try again shortly.' : 'The model could not answer. Try again.'),
    { status: rateLimited ? 429 : 502, retryAfter: 15 }
  )
}