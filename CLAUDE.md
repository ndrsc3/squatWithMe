# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**squatWithMe** — a group squat accountability app. Users commit to 100 squats/day and track each other on a shared leaderboard. Single-page app with a serverless backend. Deployed on Vercel.

## Commands

```bash
# Development
npm run dev            # Vite dev server at localhost:5173
npx vercel dev         # Local dev with Vercel serverless functions

# Production build
npm run build          # Vite build → dist/

# Preview built output
npm run preview        # Serve dist/ locally with Vite preview

# Lint / Format
npm run lint           # ESLint on src/ api/ vite.config.ts
npm run format         # Prettier --write on all source files
```

## Architecture

**Flat structure** — no monorepo. All source at project root.

### Frontend

- **Vanilla TypeScript/HTML/CSS** — no framework
- `src/` — TypeScript source (bundled by Vite)
- `public/` — static assets copied verbatim to `dist/` (styles, images)
- `index.html` — single entry point
- `dist/` — Vercel output directory (do not edit directly)

**Entry point:** `src/main.ts` — creates `SquatApp` on `DOMContentLoaded`.

**Feature modules in `src/`:**
- `app.ts` — `SquatApp` class, state, screen management, event wiring
- `types.ts` — shared TypeScript interfaces
- `kv-client.ts` — typed fetch wrappers for all API endpoints (with 5-min cache on `getUsers`)
- `user.ts` — device fingerprinting, `setupUser()`, `recoverAccount()`
- `squats.ts` — `recordSquat()`, `calculateStreak()`
- `leaderboard.ts` — `renderGrid()` builds the DOM leaderboard grid

**CSS in `public/styles/`** organized by: `base/` (variables, reset, typography), `components/` (buttons, grid, forms), `layout/` (header, footer).

### Backend (`api/`)

Vercel serverless functions (Node.js 20.x, TypeScript compiled by Vercel automatically):
- `check-username.ts` — `POST /api/check-username` — checks username availability
- `save-user.ts` — `POST /api/save-user` — creates new user
- `record-squat.ts` — `POST /api/record-squat` — records today's squat
- `get-users.ts` — `GET /api/get-users` — returns all active users with squat data
- `recover-account.ts` — `POST /api/recover-account` — account recovery via secret answer
- `remove-inactive.ts` — `POST /api/remove-inactive` — prunes inactive users (30-day threshold)
- `ws.ts` — WebSocket server (kept but not wired to frontend)
- `_lib/storage.ts` — shared KV helpers (not an endpoint, not exposed by Vercel)

### Data Schema (KV keys)

| Key | Type | Description |
|---|---|---|
| `userIndex` | Hash | `{ usernameLower → userId }` |
| `user:{userId}` | JSON | Full user record (username, recoveryHash, devices, lastActive) |
| `activeUsers` | Set | Set of userId strings |
| `squats:{YYYY-MM}:{userId}` | Set | Set of day-of-month integers (e.g. `{1, 5, 12}`) |

### Routing (`vercel.json`)

- `/api/*` → serverless functions
- Everything else → filesystem (static output in `dist/`)

## Environment Variables

Required in `.env.local` for local Vercel dev:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `VERCEL_KV_REST_API_URL`
- `VERCEL_KV_REST_API_TOKEN`
- `VERCEL_KV_REST_API_READ_ONLY_TOKEN`

## Git Workflow

Feature branches → main → Vercel auto-deploys on push to main.

```bash
git checkout -b feature/my-change
# ... edit, build, validate ...
git checkout main
git merge feature/my-change
git push origin main
```

Use `/ship` skill to walk through the validate → commit → push sequence.

## Idea Pipeline

```
docs/explorations/   ← ideas at any stage
docs/plans/          ← implementation plans
docs/TASKS.md        ← actionable task board
```

Use `/backlog` at session start for orientation.
