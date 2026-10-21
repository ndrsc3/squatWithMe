# Task Board

_Last touched: 261020 · **This board is the only tracker.** V2 shipped to production 260806 and tracking moved here — underScore holds no rows for this project. Its plan is closed at `_underScore/work/plans/implemented/260803-squat-with-me-v2.md` (historical record: phases, locked decisions, branch-reconciliation reasoning). Design brief: `_underScore/work/explorations/260804-squat-with-me-uiux-redesign.md` (closed)._

## P1 — Blockers

_None_

## P2 — Next Up

- [ ] [VALIDATION] **No browser E2E exists — decide whether that's acceptable.** V2 reached production on unit tests (`auth`, `geo`, `squats`) plus `npm run smoke`. Smoke proves every serverless function *loads* under Node ESM; nothing proves the user flow *works*. The original V2 plan called for `signup/login → create list → add/react/comment` as an E2E and it was never built — the runtime-load gate was added instead, after two production outages, and covers a different failure class. Options: add a headless browser run of that one path to the floor, or record the gap deliberately so it stops reading as covered. Related: `_underScore/memory/feedback/test-the-deployed-artifact.md`.
- [ ] [FEATURE] **Item attribution UI — show who added each item.** `createdBy` is captured end to end (`api/_lib/domain.ts` → `src/api-client.ts`) but has exactly one consumer: the delete-permission check at `src/views/lists.ts:267`. It is never rendered. Deferred during the styling pass and never picked back up; the last open item from the List feature (P2 in the V2 plan).

## P3 — Backlog

- [ ] [FEATURE] Map wave — Leaflet render of geocoded items (geo layer shipped 260804; map is rendering-only)
- [ ] [FEATURE] Itinerary/corridor wave ("what's on the way A→B") — computable from existing coords
- [ ] [FEATURE] Offline squat sync (record while offline, sync on reconnect)
- [ ] [FEATURE] Toast notification system for feedback

## Parked

- [ ] [FEATURE] WebSocket real-time leaderboard (`ws.ts` was deleted in P0) — decided 260804: refresh-on-focus covers a 6-person crew; revisit only if the roll-call needs to feel live.
- [ ] [FEATURE] Squat-led training program — winter snowboard readiness; the one thread of the original reboot vision never built or planned. Natural home = the stats/personal view. Concept partner: Grace.

## Superseded

- ~~remove-inactive cron~~ — superseded 260804 by the dormant-fade rule in the stats redesign (inactive users dim, never removed; no job needed).

## Done

- [x] [FEATURE] Rep counter 261020 — "For those who lack discipline..." −/+ and editable count under the squat button; saved server-side in `squat_reps` (ephemeral, erased at the new day); reaching 100 records the day. Also dropped the `@vercel/node@5.6.16` runtime pin from `vercel.json` — Vercel CLI 65 failed every function locally with it (`dev-server.mjs matches .vercelignore`).
- [x] **V2 merged to `main` 260806** (PR #1, `4eafb32`) — production. `v2` is an ancestor of main, zero divergence.
- [x] [UI] Review round 260805 (`31d85c4`) — login redesign, deep-squat mascot, compact footer, maps-link addresses.
- [x] [CI] Runtime-load gate 260804 (`a608b23`) — added after three ESM defects (`528fc17`, `2a46dfc`) crashed every `/api/*` route in production *twice* with typecheck + lint + test + build all green. Recipe: `_underScore/knowledge/vercel-api-runtime-gate.md`.
- [x] [FEATURE] Geo / trip-planning layer 260804 (`276541c`, ranking fix `d72ddeb`) — Nominatim geocoding on add, computed 30km resort orbits with distances, manual near-override, backfill script. Ranking fix was necessary: pins were landing mid-mountain and on a train station. Procedure: `_underScore/knowledge/place-verification.md`.
- [x] [FEATURE] Gallery list UI 260804 (`0e4c391`) — cards with images + region, category filters, detail dialog, 🐙 approve with who-liked, dialog add-flow with og:image autopull. Plus item delete + maps links (`c960961`), 18/18 Japan items validated.
- [x] [FEATURE] Stats redesign 260804 (`6023e9d`) — direction H (personal hero + winter season-meter, roll-call chips, crew heat-strips with 7-day date marks, dormant-fade); refresh-on-focus; 15 new unit tests.
- [x] [STYLE] washi style guide vendored 260804 (`6f347ef`) — `--sg-*` contract + kawaii mascot. Guide state is **drafted**, not shipped, until the UI settles: `_underScore/knowledge/brand/README.md`.
- [x] [FEATURE] List primitive v1 260803 — lists / items / freeform-emoji reactions / comments, member-gated; Japan list seeded (18 items from `Loc - Japan`).
- [x] [DATA] Postgres migration 260803 — Neon via Vercel Marketplace; squats moved off the suspended Upstash KV; `@vercel/postgres` → `@neondatabase/serverless` behind the `db.ts` seam.
- [x] [AUTH] JWT auth in TS (`jose`) + whole-site login gate 260803.
- [x] Verify `npm run build` + `npx vercel dev` flows — V2 floor green + CI (260803)
- [x] [DX] Reboot to TypeScript + Vite + ESLint + Prettier (matching web_bananaRodeo structure)
- [x] [DX] Split monolithic `styles.css` into modular partials under `public/styles/`
- [x] [DX] Convert `api/*.js` to TypeScript (V2 rebuilt the API on `api/_lib/` repos)
- [x] [DX] Modularize `app.js` (1008 lines) into `src/` modules
