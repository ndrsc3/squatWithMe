# Task Board

_Last touched: 2026-03-17_

## P1 — Blockers

_None_

## P2 — Next Up

- [ ] [DX] Verify `npm run build` passes cleanly after reboot
- [ ] [DX] Verify `npx vercel dev` local dev flow works end-to-end
- [ ] [FEATURE] Wire WebSocket (`ws.ts`) to frontend for real-time leaderboard updates

## P3 — Backlog

- [ ] [FEATURE] Offline squat sync (record while offline, sync on reconnect)
- [ ] [FEATURE] Add toast notification system for feedback
- [ ] [DX] Add `remove-inactive` cron job or Vercel scheduled function

## Done

- [x] [DX] Reboot to TypeScript + Vite + ESLint + Prettier (matching web_bananaRodeo structure)
- [x] [DX] Split monolithic `styles.css` into modular partials under `public/styles/`
- [x] [DX] Convert `api/*.js` to TypeScript with `api/_lib/storage.ts` shared helpers
- [x] [DX] Modularize `app.js` (1008 lines) into `src/` modules
