# 🏋️‍♂️ Squat With Me

A friends-only accountability app: commit to 100 squats a day on a shared leaderboard, and plan the group trip on collaborative lists.

## Stack

- **Frontend:** vanilla TypeScript + Vite (`src/`)
- **API:** Vercel serverless functions in TypeScript (`api/`)
- **Database:** Neon Postgres (`db/schema.sql`)
- **Auth:** JWT in an HttpOnly cookie; the whole site is behind a login
- **Runtime:** Node 24 (`.nvmrc`, `engines`, CI and Vercel all agree)

## Local development

One-time setup:

```bash
npm ci
vercel link                    # pick app-squatwithme
vercel env pull .env.local     # fills the keys listed in .env.example
```

Then, every time:

```bash
npm run dev:full               # checks your setup, then starts vercel dev → http://localhost:3000
```

`dev:full` refuses to start, and prints the fix, if:
- `node_modules` doesn't match the lockfile
- the repo isn't linked to Vercel
- `.env.local` is missing a key
- `DATABASE_URL` points at the production database

A different Node version only produces a warning. `npm run dev:check` runs the checks without starting the server.

## Checks

```bash
npm run typecheck && npm run lint && npm test && npm run build && npm run smoke
```

CI runs the same five checks on every PR. `smoke` imports every API function under Node, which catches the deploy-only failures the other four miss.

For UI changes, also run the browser test before opening the PR:

```bash
npm run e2e    # signs up a throwaway user on the dev database and drives the rep counter, phone + desktop
```

It starts `npm run dev:full` if nothing is running on port 3000, clears earlier `e2e-…` users from the dev database first (never production), and saves screenshots to `e2e/.results/shots/`. The first run needs `npx playwright install chromium`.

## Shipping

Branch off `main`, open a PR, wait for CI and the Vercel preview to go green, then merge. Merging to `main` deploys to production.

---
Made with ❤️ for the squat community · [@ndrsc3](https://github.com/ndrsc3)
