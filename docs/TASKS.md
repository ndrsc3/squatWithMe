# Task Board

_Last touched: 260804 · Plan of record: `_underScore/work/plans/active/260803-squat-with-me-v2.md`_

Code-adjacent tasks only — phases, decisions, and design briefs live in the plan of record
and `_underScore/work/explorations/260804-squat-with-me-uiux-redesign.md`.

## P1 — Blockers

_None_

## P2 — Next Up

_None_

## P3 — Backlog

- [ ] [FEATURE] Offline squat sync (record while offline, sync on reconnect)
- [ ] [FEATURE] Toast notification system for feedback
- [ ] [FEATURE] Map wave — Leaflet render of geocoded items (geo layer shipped 260804; map is rendering-only)
- [ ] [FEATURE] Itinerary/corridor wave ("what's on the way A→B") — computable from existing coords

## Parked

- [ ] [FEATURE] WebSocket real-time leaderboard (`ws.ts` was deleted in P0) — decided 260804: refresh-on-focus covers a 6-person crew; revisit only if the roll-call needs to feel live.

## Superseded

- ~~remove-inactive cron~~ — superseded 260804 by the dormant-fade rule in the stats redesign (inactive users dim, never removed; no job needed).

## Done

- [x] [FEATURE] Stats redesign shipped 260804 — direction H (personal hero + winter season-meter from relaunch 260803, roll-call chips, crew heat-strips w/ 7-day date marks, dormant-fade) in `views/squat.ts` + `leaderboard.ts` + `components/stats.css`; refresh-on-focus; 15 new unit tests.
- [x] Verify `npm run build` + `npx vercel dev` flows — V2 floor green + CI (260803)
- [x] [DX] Reboot to TypeScript + Vite + ESLint + Prettier (matching web_bananaRodeo structure)
- [x] [DX] Split monolithic `styles.css` into modular partials under `public/styles/`
- [x] [DX] Convert `api/*.js` to TypeScript (V2 rebuilt the API on `api/_lib/` repos)
- [x] [DX] Modularize `app.js` (1008 lines) into `src/` modules
