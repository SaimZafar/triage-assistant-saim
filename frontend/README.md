# Frontend: Orbit Logistics triage

React + Vite. Plain version first (guide steps 1 to 6). No backend is needed to try it.

## Run

```
cd frontend
npm install
npm run dev
```

- Open http://localhost:5173/?mock to use `public/mock/*.json` with no backend. Citation chips open the real files from `../problem_c_data`.
- Without `?mock` the app calls `/api/report`, `/api/ask` and `/api/files/:name`. Vite proxies `/api` to `http://localhost:8000`. Another port: `VITE_PROXY_TARGET=http://localhost:5000 npm run dev`.
- The contract (field names, `[[file#ref]]` citations, 429 + `retryAfter`) is written at the top of `src/api/useTriage.js`.

## What is in

Landing (plain), console with presets and states (loading, rate limit with one retry, error, offline, empty), answer panel, report with the 11 sections in order, citation chips, evidence drawer (Esc closes, focus returns), incident cards that filter the report, UTC/PKT toggle, time slider, attack path list, stats row.

## Not in yet

3D network map, incident ring, runbook and source shelves, stats grid with MagicBento, ScrollExpand on the landing.

## React Bits components

All 12 components (JSX + CSS from the React Bits repo) are in `src/components/fx/`. They load lazily and by name; if one crashes the plain fallback shows. Wired now: LaserFlow and FoldText (landing), GlassSurface (top bar), TrueFocus (loader), CometDial (time dial). Not wired yet: the other seven.

## Notes

- Do not ship `public/mock/` text as real output.
- The Gemini key lives only on the backend.
