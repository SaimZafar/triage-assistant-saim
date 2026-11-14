const MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite']
const wait = ms => new Promise(r => setTimeout(r, ms))

export async function askGemini(system, user) {
  let lastStatus = 0
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: user }] }],
            generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
          })
        }
      )

      if (res.ok) {
        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? ''
        try {
          return JSON.parse(text)
        } catch {
          lastStatus = 502
          continue
        }
      }

      lastStatus = res.status
      if (res.status === 429 || res.status >= 500) {
        await wait(1500 * (attempt + 1))
        continue
      }
      const body = await res.json().catch(() => ({}))
      throw Object.assign(new Error(body.error?.message ?? `Gemini error ${res.status}`), { status: res.status })
    }
  }
  throw Object.assign(new Error('The model is busy.'), { status: lastStatus === 429 ? 429 : 502, retryAfter: 15 })
}