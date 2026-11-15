# Orbit Logistics Security Incident Triage Assistant

An AI assistant that reads a full day of security logs (4 Nov 2026) and tells a security analyst what happened, how sure we are, and what to do next. Every claim is cited to a specific log line or table row, and the app says "insufficient evidence" instead of guessing.

Built for the TechFusion hackathon, **Challenge C: Security Incident Triage Assistant**.

**Live app:** https://triage-assistant-saimm.vercel.app

## What it does

- **Analyze the full day.** One click produces an incident report: incidents grouped by severity, a timeline, confirmed findings, suspected findings with their assumptions, evidence gaps, recommended actions and who to contact.
- **Ask a question.** Free-text questions such as "Was the VPN login from Romania really Ayesha?" or "How much data left the file server?" are answered only from the 20 provided files.
- **Cited evidence.** Answers carry inline citations such as `[[11_vpn_auth_log.md#L7]]`. Clicking one opens the source file in the evidence drawer.
- **Honest confidence.** Each claim is labelled `confirmed` (a log line shows it directly), `suspected` (fits an attack pattern but needs an assumption, which is stated) or `insufficient` (the logs are silent or the source is missing).
- **Time zones.** Times are shown in UTC with a PKT (UTC+5) toggle. Log sources use different time zones, so the model is told to normalise them first.
- **Missing sources.** The report lists log sources that are absent, so analysts know where the blind spots are.

## How it works

```
problem_c_data/ (20 files)
        |
        v
corpus.js  --> numbers every log line (L1|, L2|, ...) so the model can cite it
        |
        v
Gemini (rules from the company security policy in the system prompt)
        |
        v
JSON answer / report
        |
        v
validate.js --> removes any citation that points to a line or row that does not exist
        |
        v
adapt.js --> reshapes the report for the frontend --> React UI
```

Design choices that go beyond a single prompt:

- **Retrieval with line numbers.** All 20 files are loaded into the prompt with numbered lines, which makes precise citations possible.
- **Structured output.** The model returns JSON, which the backend parses and checks.
- **Citation validator.** Citations to files, lines, table rows, runbook steps or rules that do not exist are stripped and counted, so a hallucinated reference never reaches the user.
- **Report completeness check.** A report must contain a timeline, confirmed claims, actions and contacts, or it is rejected and retried.
- **Rate-limit handling.** Gemini calls retry with backoff on 429 and 5xx responses, and fall back to a lighter model for questions.
- **No overclaiming.** The prompt forbids saying data was stolen unless a log shows data moving. A large transfer shows a transfer, not which files were read.
- **Saved report snapshot.** The full-day report is built from the same 20 files every time, so a validated snapshot (`backend/saved-report.json`) is served instantly with no Gemini quota. A live rebuild is only possible when `ALLOW_REFRESH=1` is set, so the public server cannot be used to burn the quota.

## Tech stack

- **Frontend:** React + Vite
- **Backend:** Node.js 22, Express 5
- **LLM:** Google Gemini (API key supplied by the organisers)
- **Hosting:** Vercel (serverless function for the API, static frontend). A Dockerfile and `docker-compose.yml` are included as a fallback.

## Project structure

```
backend/
  server.js        Express app and API routes
  lib/
    corpus.js      loads the 20 files and numbers the log lines
    gemini.js      Gemini calls with retry, timeout and model fallback
    prompts.js     system prompt with the company security rules
    report.js      report prompt and report validation
    validate.js    citation validator for answers
    adapt.js       reshapes the report for the frontend
  save-report.js   writes saved-report.json from a live run
  saved-report.json
frontend/          React + Vite app (console, report, evidence drawer)
problem_c_data/    the 20 source files provided by the organisers
api/index.js       Vercel entry point (re-exports the Express app)
vercel.json        Vercel build and routing config
Dockerfile         builds the frontend and runs the backend
docker-compose.yml
```

## API

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/health` | Health check, returns `{"ok":true}` |
| GET | `/api/files` | Lists the 20 source files |
| GET | `/api/files/:name` | Returns one source file (only the 20 known names are served) |
| POST | `/api/ask` | Body `{"question": "..."}`. Returns `answer`, `evidence`, `assumption`, `gaps` and validated citations. Questions are limited to 2000 characters. |
| GET / POST | `/api/report` | The full-day incident report, in the shape the frontend uses |
| GET | `/api/report/raw` | The validated report as built, before reshaping |

## Run it locally

Requirements: Node 22 or newer.

1. Create `backend/.env`:

   ```
   GEMINI_API_KEY=your_key_here
   ```

   The file is git-ignored. Never commit a key.

2. Start the backend:

   ```
   cd backend
   npm install
   npm start
   ```

3. In a second terminal, start the frontend in dev mode:

   ```
   cd frontend
   npm install
   npm run dev
   ```

   Open http://localhost:5173. The dev server proxies `/api` to port 8000.

To run everything from one port instead, build the frontend (`npm run build` inside `frontend`), restart the backend and open http://localhost:8000.

## Run with Docker

```
docker compose up --build
```

Set `GEMINI_API_KEY` in your shell first (PowerShell: `$env:GEMINI_API_KEY="your_key_here"`). Then open http://localhost:7860.

## Deploy to Vercel

1. Import the repo on vercel.com with the **Other** preset and the root directory `./`.
2. Add the environment variable `GEMINI_API_KEY`.
3. Do not set `ALLOW_REFRESH`, so the public site serves the saved report and cannot be used to spend your Gemini quota.
4. Deploy. `vercel.json` builds the frontend and routes `/api/*` to the Express app.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | Yes | Gemini API key |
| `ALLOW_REFRESH` | No | Set to `1` to allow `?refresh=1` to rebuild the report live. Leave unset on public servers. |
| `PORT` | No | Server port when running locally (default 8000) |

## Known limits

- Questions use the live Gemini API, so they can take 10 to 60 seconds, and free-tier quotas can cause "busy" responses. The server retries and falls back to a second model before giving up.
- The full-day report is served from a snapshot of an earlier live run. Rebuilding it needs `ALLOW_REFRESH=1` and uses quota.
- Answers use only the 20 provided files. The assistant has no outside knowledge by design.
- The validator checks that citations point to something that exists, not that the cited line truly supports the claim.

## Team

- Saim Zafar
- Abdul Wahab
