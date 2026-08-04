# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**squatWithMe V2** — a friends-only accountability app: commit to 100 squats/day on a shared leaderboard, and plan the group trip on collaborative Lists (add items, approve, comment). First list: the Feb 2027 Japan snowboard trip. Vanilla TypeScript + Vite SPA, Vercel serverless API, Neon Postgres. Whole site is login-gated (JWT).

Active branch: `v2` (main still serves the legacy V1 app until promotion).
Plan of record: `_underScore/work/plans/active/260803-squat-with-me-v2.md`.

## Commands

```bash
npm run dev            # Vite dev server (frontend only, no API)
npx vercel dev         # Full local dev: frontend + serverless functions (use this)
npm run typecheck      # tsc --noEmit
npm run lint           # ESLint on src/ api/ vite.config.ts
npm test               # vitest (streak + auth unit tests)
npm run build          # Vite build → dist/
node db/run-schema.mjs # Apply db/schema.sql to DATABASE_URL (idempotent)
```

**The floor:** typecheck + lint + test + build must be green before any commit. CI (`.github/workflows/ci.yml`) enforces the same four on push (main, v2) + PRs.

## Architecture

### Frontend (`src/`)
- `main.ts` → `app.ts` — slim orchestrator: login gate (`auth-me` on boot), hash router (`#/list/<id>`), theme toggle
- `views/auth.ts` — login/signup screen
- `views/squat.ts` — squat tracker (button, stats, leaderboard grid)
- `views/lists.ts` — lists overview + list detail (items, reactions, comments); renders user content via `textContent` only (XSS-safe) — keep it that way
- `api-client.ts` — typed fetch wrappers for the whole API
- `squats.ts` / `leaderboard.ts` — streak calc (unit-tested) + grid render

### Backend (`api/`)
Vercel serverless functions, flat files. Shared plumbing in `api/_lib/`:
`db.ts` (the ONLY Postgres seam — `@neondatabase/serverless`, keep provider swaps inside this file) · `auth.ts` (JWT via `jose`, scrypt passwords, `requireUser`) · `http.ts` (method guard, cookie helpers) · `domain.ts` (types) · `users-repo.ts` / `lists-repo.ts` / `squats-repo.ts` (typed data access).

Endpoints: `auth-signup/login/me/logout` · `lists` (GET all w/ membership, POST create) · `list-members` (POST join — open join, friends-trust) · `list-items` (GET/POST, member-gated) · `item-reactions` (POST/DELETE, freeform emoji) · `item-comments` (POST) · `get-users` + `record-squat` (squat tracker, session-authed).

### Data (Postgres — Neon via Vercel Marketplace)
Schema: `db/schema.sql` — `users`, `lists` (kind: travel/squat/generic), `list_members`, `items`, `reactions` (PK item+user+emoji), `comments`, `squats` (user+day). Generalized List primitive; squats table replaces the dead legacy KV store (suspended Upstash resource, disconnected 260804).

## Environment

`.env.local` via `vercel env pull` (repo is linked to project `app-squatwithme`):
- `DATABASE_URL` — injected by the Neon integration
- `JWT_SECRET` — set in all three Vercel envs

## Styling — house system (do not freelance)

- Style guide: **washi** (`public/styles/base/washi.css` — VENDORED copy; canonical = `_underScore/knowledge/brand/guides/washi.css`, edit there first, mirror here). Components consume `--sg-*` roles through the bridge in `public/styles/base/variables.css` — never raw colors.
- Theme: `light-dark()` tokens flipped via `color-scheme`; toggle sets `.light-theme` on `<html>`.
- Design/styling work starts from `_underScore/knowledge/brand/` + `knowledge/web-stack.md` (§ Style guides, radar loop for new libs — vendor, don't hand-roll).
- **Visual review** uses `_underScore/knowledge/web-visual-verification.md` (headless Brave recipe; note the `--virtual-time-budget` and mobile-width quirks documented there). Keeper shots → `_underScore/_artifacts/ui-smoke/squatwithme/`.

## Git Workflow

Work on `v2`. Push → CI + Vercel preview (deployment-protected). Do not merge to `main` (= production deploy) without owner go-ahead. No auto-commit — floor green + owner approval per commit.
