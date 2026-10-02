---
type: exploration
status: archived
tags:
  - squat-with-me
  - uiux
  - design
  - process
date: 260804
---

# Squat With Me V2 — UI/UX Redesign (owner notes → design phase)

| Field | Value |
|-------|-------|
| **Trigger** | Conversation 260804 — owner reviewed the first styling pass (washi guide + kawaii mascot) live and delivered product-level design notes; explicitly not tied to the inherited V1 layout ("old project I made"). |
| **Modules** | `workSpace/squatWithMe` (frontend views, `db/schema.sql`, item API), `_underScore/knowledge/brand/guides/washi.css` |
| **Outcome** | Design brief captured and **built 260804–06** — Gallery UI, stats direction-H, geo layer, review round; shipped to production with V2. Map + itinerary waves carried to the repo board (`workSpace/squatWithMe` `docs/TASKS.md`). Plan closed: `_underScore/work/plans/implemented/260803-squat-with-me-v2.md` |
| **Process trial** | **"UI/UX exploration" as a distinct dev phase** — between functional validation and styling. This note was the first instance. **Verdict 260805: adopted** — proven twice (this project's stats round + Auricle PWA round 2) and graduated to the house method at `_underScore/knowledge/uiux-sketch-rounds.md`, carrying two owner-surfaced corrections (scan the internal design shelf first; "styling deferred" still means "contract adopted"). |

## Context
V2 functional build is done (P0–P2: Postgres, JWT auth, List primitive, squat migration) and a first styling pass shipped: washi `--sg-*` style guide, Zen Maru type, vermillion/ink palette, cat-butt mascot. Owner reviewed at localhost and reframed the product: **"a specific accountability app to get in shape and plan a trip together."** The notes below go beyond styling into information architecture and data model — hence an exploration, not a punch list.

## Owner's notes (260804, lightly structured)

**Main page**
1. Japanese characters need explaining/repositioning — 尻 hanko by the title, 一緒にスクワット after the subtitle. Stylistically JP text should sit **below** the English, not inline after it.
2. "Definitely need to brainstorm a better way to render stats of who is squatting" — the V1 grid is not the answer.
3. "Shared Lists" → **"The Lists"**, no emoji in the heading.
4. Footer (X/GitHub/coffee + credits) is imbalanced against the new design — should feel like part of the app.

**List page**
5. Add-item should be behind a **button → opens a window** (modal/dialog), not an always-visible form.
6. Category becomes a **dropdown**: resort / onsen / food / other.
7. **Autopull an image** when something is added (from the item's link).
8. Items render as **cards with an image**, short overview text (not full description), and **region**.
9. Reactions: kill freeform emoji → **single 👍 approve**; hover shows **who** liked it.
10. List **filterable by type** (category).
11. Comment via a button, not an always-visible composer.
12. Card face shows **counts** (approves, comments), not modify/add UI.
13. Click a card → **zoom to detail view**: full description, location, comments, and there the approve + comment UI lives.

**Bonus**
14. **Map view** — plot everything the crew adds.

## Design analysis (agent)

**IA shift:** from "form + flat list of rows" to **browse (cards, counts, filters) vs engage (detail view, approve, comment)** — a two-level hierarchy. Card face = scannable summary; detail = full content + interaction. This is a real pattern (progressive disclosure) and fits the trip-planning reframe.

**Data-model deltas required (schema touch):**
- `items.region` (text) — new field, shown on card.
- `items.image_url` (text) — autopull candidate: serverless fetch of the item URL → parse `og:image` (OpenGraph) with a fallback placeholder per category. No URL → no image, category art instead.
- `items.description` vs `note` — owner distinguishes "simple overview" from "full description"; current single `note` may split or card just truncates.
- Reactions: table already supports 👍-only (constrain emoji at the API/UI layer — schema needs no change; PK(item,user,emoji) still right). Who-liked hover needs **usernames in the payload** (currently userIds only) — join users in `getListItems`.
- Map: items need geo (lat/lng) — geocode from region/title at add-time (Nominatim/OSM free tier) or manual pin later. Defer shape until map wave.

**Platform notes:** modal = native `<dialog>` (zero-dep, already proven on deigma's platform page). Filters/counts = client-side over the existing payload. Map = vendor Leaflet per the radar loop (spotted → deigma specimen → absorb) — do NOT hand-roll.

**Stats brainstorm (item 2)** — candidates to sketch: streak-focused "flame row" per user; calendar heat-strip per user (current grid, better clothes); "today" roll-call (who squatted today, big; history secondary). Needs its own mini-iteration with the owner.

## Decisions (owner, 260804)
- **Card layout = Gallery** (direction A from the interactive mockup round: image-top grid cards, region in indigo, counts on the face). Ledger/Postcards passed over; mockup lives at `public/mockups/index.html` (gitignored), shots in `_artifacts/ui-smoke/squatwithme/260804-mockup-*.png`.
- **Approve = 🐙 octopus**, not 👍 — single-tap like, hover reveals who. (Mockup updated.)
- **Hanko 大尻 stays**; container fixed to auto-size (was overflowing).
- **Washi guide stays *drafted*** — develop through the redesign, ship to deigma/README after it settles (two-state model ratified into `260723-style-guide-system.md`).
- **Stats round 2 (owner, 260804):** base = **Hybrid A-over-B** (hero + roll-call chips over crew heat-strips). **Winter season-meter** in the personal panel — countdown generalized from "Japan Feb 2027" to *winter* (Dec 1 default), rendered as a progress meter (squat-days banked vs days to go), not a clock. **Dormant crew fades, never hides** (zero streak + quiet > 1 week → dimmed, sorted last, 😴). **Liveness = refresh-on-focus** (+ after own squat); the V1 `docs/TASKS.md` WebSocket item stays parked. Lee Bound §Squat spec ruled not relevant. Sketch = direction H in `public/mockups/stats.html` (default view).

## Action Items
- [x] [260804] Sketch layout directions (3 interactive mockups; owner picked **Gallery**)
- [x] [260804] Stats-rendering brainstorm — 3 sketches built (`public/mockups/stats.html`, gitignored; shots `_artifacts/ui-smoke/squatwithme/260804-stats-{a,b,c}-{dark,light}.png`): **A Roll-call** (today-first: personal hero streak + who-squatted-today chips), **B Heat-strips** (personal month heatmap + stat tiles; crew as 14-day strips), **C Flame ladder** (personal tile row; streak leaderboard, emphasis form — your bar vermillion, crew warm-gray, dot = today). Every direction = personal panel + community panel per owner note. Single-hue data color (vermillion) — indigo failed the dataviz chroma validator as a data hue, kept UI-only. Round 2 decided (see Decisions): **direction H = Hybrid A-over-B + winter meter + dormant fade**, shot `260804-stats-h-{dark,light}.png`. **Shipped** in `views/squat.ts` + `leaderboard.ts` + `components/stats.css` (commit `6023e9d`, floor green, 15 new unit tests; impl verified visually via gitignored `public/mockups/impl-harness.html` — real renderer + CSS w/ fake data, dark/light/mobile).
- [x] [260804] Schema migration: `items.region`, `items.image_url` (single `note`, card line-clamps)
- [x] [260804] API: usernames in approvals/comments payloads; approve = 🐙 toggle endpoint
- [x] [260804] `og:image` autopull (`api/_lib/og.ts`, fires on add when URL present — verified live)
- [x] [260804] List page reworked per notes 5–13 (commit `0e4c391`)
- [x] [260804] Main-page polish notes 1, 3, 4 (JP placement + 大尻 hanko, "The Lists", footer inside app w/ token border) — note 2 (stats) still open above
- [x] [260804] **Geo layer built** (owner-ratified after design discussion; commit `276541c`): `lat`/`lng` auto-geocoded via OSM Nominatim at add-time; resort detail computes its 30km orbit live (distance-sorted, with km); manual `near_item_id` override via PATCH + selector; 14/18 Japan items located (4 true "anywhere" concepts correctly unlocated). Key decision: route is weather-dynamic → **nothing pinned to legs; all proximity computed on demand**. "Between A→B" corridor + map = later waves on this same layer (map = pure rendering now).
- [ ] Map wave (bonus): radar-loop Leaflet — geocoding SOLVED, map is now rendering-only
- [ ] Itinerary/corridor wave ("what's on the way A→B") — computable from existing coords once a route pair is picked
- [ ] Process retro after this phase: did "UI/UX exploration" earn its place in the workflow?

## Related
- `_underScore/work/plans/implemented/260803-squat-with-me-v2.md` — P4 (styling) superseded → this became the design phase driving P4; plan closed 260811
- `_underScore/work/explorations/260803-squat-with-me-v2-refactor-pivot.md` — parent exploration
- `_underScore/knowledge/brand/guides/washi.css` — the style guide this design builds on
- `_underScore/knowledge/web-stack.md` § Style guides · radar loop (Leaflet intake path)
- `_underScore/knowledge/web-visual-verification.md` — mockup review loop
