# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**squatWithMe V2** — a friends-only accountability app: commit to 100 squats/day on a shared leaderboard, and plan the group trip on collaborative Lists (add items, approve, comment). First list: the Feb 2027 Japan snowboard trip. Vanilla TypeScript + Vite SPA, Vercel serverless API, Neon Postgres. Whole site is login-gated (JWT).

**V2 is production.** Merged to `main` 260806 (PR #1); the legacy V1 app is gone. Work on branches off `main`.
**Tracking lives here** — `docs/TASKS.md` is the only board. The V2 build plan is closed and kept as history at `_underScore/work/plans/implemented/260803-squat-with-me-v2.md` (phases, locked decisions, branch-reconciliation reasoning); underScore carries no open rows for this project.

## Commands

```bash
npm run dev:full       # Full local dev: scripts/dev-check.mjs preflight, then vercel dev (use this)
npm run dev:check      # Preflight only — lockfile, Vercel link, .env.local keys, DATABASE_URL ≠ production
npm run dev            # Vite dev server (frontend only, no API)
npm run check          # The floor: typecheck + lint + test + build + smoke — what CI and the pre-commit hook run
npm run typecheck      # tsc --noEmit
npm run lint           # ESLint on src/ api/ vite.config.ts
npm test               # vitest (streak + auth unit tests)
npm run build          # Vite build → dist/
npm run smoke          # Runtime-load gate — imports every api/* fn under Node ESM
npm run e2e            # Playwright, real logged-in UI on the dev DB (starts dev:full if :3000 is free); shots → e2e/.results/shots/
node db/run-schema.mjs # Apply db/schema.sql to DATABASE_URL (idempotent; refuses production outside a production build)
node db/seed-japan.mjs <user>  # Seed the Japan list (verified set); refuses if it exists
node db/audit-data.mjs         # Read-only data health check — counts, form, orphans, geo sanity
```

**The floor:** typecheck + lint + test + build + **smoke** must be green before any commit. One script, `npm run check`, runs all five; the pre-commit hook (`.githooks/pre-commit`, installed by `npm install` via `prepare`) and CI (`.github/workflows/ci.yml`, push to main/v2 + PRs) both run exactly it.

**`npm run smoke` exists because the other four cannot see a broken deployment.** On 260804 every `/api/*` route 500'd in production — twice — with the floor fully green, because no static check ever loads a function under the Node ESM runtime that serves it. The gate emits `api/` with tsc and actually `import()`s each entrypoint. Two real bugs it now blocks: `package.json` missing `"type": "module"` (emitted ESM parsed as CJS → `SyntaxError`), and extensionless relative imports (`moduleResolution: "bundler"` permits them, tsc rewrites nothing, Node's resolver → `ERR_MODULE_NOT_FOUND`). **Relative imports in `api/` must carry `.js`.** Note the `"type"` check is asserted explicitly rather than left to the import: Node 22+ auto-detects ESM syntax, so a modern local Node loads what Vercel's runtime rejects. Recipe + rationale: `_underScore/knowledge/vercel-api-runtime-gate.md`.

## Architecture

### Frontend (`src/`)
- `main.ts` → `app.ts` — slim orchestrator: login gate (`auth-me` on boot), hash router (`#/list/<id>`), theme toggle
- `views/auth.ts` — login/signup screen
- `views/squat.ts` — squat tracker (button, rep counter, stats panels, refresh-on-focus)
- `views/lists.ts` — lists overview + list detail (items, reactions, comments); renders user content via `textContent` only (XSS-safe) — keep it that way
- `api-client.ts` — typed fetch wrappers for the whole API
- `squats.ts` / `leaderboard.ts` — streak/season calcs (unit-tested) + stats-panels render (You / Today / The Crew)

### Backend (`api/`)
Vercel serverless functions, flat files. Shared plumbing in `api/_lib/`:
`db.ts` (the ONLY Postgres seam — `@neondatabase/serverless`, keep provider swaps inside this file) · `auth.ts` (JWT via `jose`, scrypt passwords, `requireUser`) · `http.ts` (method guard, cookie helpers) · `domain.ts` (types) · `users-repo.ts` / `lists-repo.ts` / `squats-repo.ts` (typed data access).

Endpoints: `auth-signup/login/me/logout` · `lists` (GET all w/ membership, POST create) · `list-members` (POST join — open join, friends-trust) · `list-items` (GET/POST, member-gated) · `item-reactions` (POST/DELETE, freeform emoji) · `item-comments` (POST) · `get-users` + `record-squat` (squat tracker, session-authed) · `squat-reps` (GET/POST live rep counter; reaching 100 records the day).

### Data (Postgres — Neon via Vercel Marketplace)
Schema: `db/schema.sql` — `users`, `lists` (kind: travel/squat/generic), `list_members`, `items`, `reactions` (PK item+user+emoji), `comments`, `squats` (user+day), `squat_reps` (one ephemeral row per user — a row from an earlier day reads as 0, so the counter erases itself daily). Generalized List primitive; squats table replaces the dead legacy KV store (suspended Upstash resource, disconnected 260804).

**Item admission bar (owner rule 260804).** A list item must be a **specific place** — a named resort, a bathable onsen open to day visitors, a real restaurant — carrying a **live official url**, a **postal address**, and **base-area coordinates**. Categories, dish names, and "a town" do not qualify. The address is not decoration: `fillItemDialog` builds the Google Maps link from it and falls back to a fuzzy text search without it. **Food is human-entered by the crew** — don't bulk-seed it; the verified candidate pool lives in `_underScore/vault-Notes/Travel/Loc - Japan.md`.

**Geocoding (`api/_lib/geo.ts`) — don't naively trust Nominatim.** It ranks areas highly and reports a way/relation's *centroid*, and it will happily match a railway station that shares a resort's name. Both happened; see `_underScore/work/explorations/260804-japan-list-credibility-audit.md`. `pickBestHit` therefore demotes false-friend classes, prefers points over area centroids, prefers smaller areas, and drops region-scale matches; `buildGeoQuery` returns `null` when input is too vague to pin. **A wrong coordinate is worse than a missing one** — `renderNearby` computes hub proximity from coordinates, so a bad pin corrupts every "near" relationship, not just its own. When adding place data by hand, take coordinates from named OSM lift terminals / facility nodes via Overpass, never from a Nominatim place lookup. Full procedure: `_underScore/knowledge/place-verification.md`.

## Environment

`.env.local` via `vercel env pull` (repo is linked to project `app-squatwithme`):
- `DATABASE_URL` — two stores: Production = the Neon integration (scoped to Production only); Development + Preview = a custom value pointing at the schema-only Neon branch `dev` (disposable test data, never production rows)
- `JWT_SECRET` — set in all three Vercel envs

`.env.example` names the required keys (values never committed). `db/prod-endpoint.mjs` holds the production Neon endpoint id — the one place "is this production?" is answered; unset or unparseable → treated as production (fail closed).

**Schema ships with the deploy.** `vercel.json` `buildCommand` runs `db/run-schema.mjs` before `npm run build`: preview builds apply `schema.sql` to `dev`, the production build to production. `npm run build` itself stays DB-free (CI). Rules for `schema.sql` are in its header; `db/run-schema.test.mjs` enforces re-runnability.

**Node 24** everywhere: `.nvmrc`, `engines` (`24.x` — a `>=` range silently overrides the project setting with Vercel's newest major), and CI.

## Styling — house system (do not freelance)

- Style guide: **washi** (`public/styles/base/washi.css` — VENDORED copy; canonical = `_underScore/knowledge/brand/guides/washi.css`, edit there first, mirror here). Components consume `--sg-*` roles through the bridge in `public/styles/base/variables.css` — never raw colors.
- Theme: `light-dark()` tokens flipped via `color-scheme`; toggle sets `.light-theme` on `<html>`.
- Design/styling work starts from this app's own direction in `docs/design/` (the 260804 UI/UX exploration), using `_underScore/knowledge/uiux-sketch-rounds.md` as the method and `_underScore/knowledge/web-stack.md` for tooling (§ Style guides, radar loop for new libs — vendor, don't hand-roll). The washi guide above is this app's chosen guide.
- **Visual review** uses `_underScore/knowledge/web-visual-verification.md` (headless Brave recipe; note the `--virtual-time-budget` and mobile-width quirks documented there). Keeper shots → `_underScore/_artifacts/ui-smoke/squatwithme/`.

## Git Workflow

**GitHub flow: every change is a short-lived branch and a PR into `main`. The PR's Vercel preview is the staging check.** Process and rules: `_underScore/knowledge/vercel-app-dev-process.md`.

- **`main`** = production. A GitHub ruleset enforces it: changes arrive only by PR, CI `verify` must pass, the branch must be up to date with `main`, merge commits only, and `main` can't be force-pushed or deleted.
- **One branch per unit of work** (`feature/`, `fix/`, `chore/`), each in its own worktree: `git worktree add -b feature/X ../squatWithMe-X origin/main`, then inside it `ln -s ../squatWithMe/node_modules node_modules` and `cp -R ../squatWithMe/.vercel ../squatWithMe/.env.local .`. The main checkout stays on `main` and is never worked in.
- **Agents never merge without the owner's approval in chat.** Agent and owner share one GitHub account, so "reviewed" means that approval plus green CI.

1. **Commit.** The pre-commit hook runs `npm run check`. Never bypass it with `--no-verify`. For UI changes, run `npm run e2e` and read its screenshots.
2. **Before pushing, `git fetch` and rebase onto `origin/main`** if it moved. Surface conflicts; don't force-resolve.
3. **Push and open a PR into `main`.**
4. **CI `verify` and the Vercel preview run on the PR.** The preview is deployment-protected (`vercel curl <path> --deployment <url>` reaches it), and its build applies `schema.sql` to `dev`.
5. **If GitHub says the branch is out of date:** `gh pr update-branch <n>`, or rebase and push. CI reruns.
6. **Owner approves in chat, then merge:** `gh pr merge <n> --merge`. GitHub deletes the remote branch.
7. **Verify production:** the site returns 200, `/api/auth-me` returns 401, and the build log shows `statements applied (VERCEL_ENV=production)`.
8. **Clean up:** remove the worktree and local branch, and `git -C ../squatWithMe pull --ff-only`.
