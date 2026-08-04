-- Squat With Me V2 — initial schema (0001_init)
-- Generalized List primitive: one shape serves travel lists now, squats later.
-- Run once against the provisioned Postgres (Vercel Postgres / Neon).
-- Postgres 13+ (uses gen_random_uuid()).

-- ─────────────────────────────────────────────────────────────
-- users — JWT-authenticated accounts. Friends-only via invite link;
-- the whole site is login-gated, so membership tables control access.
-- ─────────────────────────────────────────────────────────────
create table if not exists users (
    id            uuid primary key default gen_random_uuid(),
    username      text        not null unique,
    email         text        unique,
    password_hash text        not null,
    display_name  text,
    created_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- lists — a shared collection. `kind` lets the same primitive serve
-- travel lists now and squats later (kind = 'squat').
-- ─────────────────────────────────────────────────────────────
create table if not exists lists (
    id         uuid primary key default gen_random_uuid(),
    name       text        not null,
    kind       text        not null default 'generic',   -- 'travel' | 'squat' | ...
    created_by uuid        not null references users(id) on delete cascade,
    created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- list_members — who can see/write a list (access control).
-- ─────────────────────────────────────────────────────────────
create table if not exists list_members (
    list_id  uuid        not null references lists(id) on delete cascade,
    user_id  uuid        not null references users(id) on delete cascade,
    role     text        not null default 'member',       -- 'owner' | 'member'
    added_at timestamptz not null default now(),
    primary key (list_id, user_id)
);

-- ─────────────────────────────────────────────────────────────
-- items — entries in a list. `category` groups within a list
-- (travel: 'resort' | 'onsen' | 'food'). url/note optional.
-- ─────────────────────────────────────────────────────────────
create table if not exists items (
    id         uuid        primary key default gen_random_uuid(),
    list_id    uuid        not null references lists(id) on delete cascade,
    title      text        not null,
    category   text,
    url        text,
    note       text,
    created_by uuid        references users(id) on delete set null,  -- keep item if author removed
    created_at timestamptz not null default now()
);

-- 260804 Gallery redesign: region shown on card face; image_url autopulled
-- (og:image) from the item's link when present.
alter table items add column if not exists region text;
alter table items add column if not exists image_url text;
-- precise address, linked to Google Maps in the detail view
alter table items add column if not exists address text;

-- 260804 trip-planning geo layer: resorts are hubs; "near" is COMPUTED from
-- coordinates (geocoded automatically at add-time via OSM Nominatim), so a
-- weather-dynamic route never depends on hand-pinned tags. near_item_id is
-- the manual override only (attach to a hub regardless of distance).
alter table items add column if not exists near_item_id uuid references items(id) on delete set null;
create index if not exists idx_items_near on items(near_item_id);
alter table items add column if not exists lat double precision;
alter table items add column if not exists lng double precision;

-- ─────────────────────────────────────────────────────────────
-- reactions — freeform emoji. PK(item,user,emoji): a user may add
-- several different emojis to an item, but not the same one twice.
-- ─────────────────────────────────────────────────────────────
create table if not exists reactions (
    item_id    uuid        not null references items(id) on delete cascade,
    user_id    uuid        not null references users(id) on delete cascade,
    emoji      text        not null,
    created_at timestamptz not null default now(),
    primary key (item_id, user_id, emoji)
);

-- ─────────────────────────────────────────────────────────────
-- comments — flat thread per item.
-- ─────────────────────────────────────────────────────────────
create table if not exists comments (
    id         uuid        primary key default gen_random_uuid(),
    item_id    uuid        not null references items(id) on delete cascade,
    user_id    uuid        references users(id) on delete set null,
    body       text        not null,
    created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- squats — one row per user per day squatted. Replaces the legacy
-- KV store (suspended 2026-08; migrated with V2). May fold into the
-- List primitive later as a deliberate move.
-- ─────────────────────────────────────────────────────────────
create table if not exists squats (
    user_id uuid not null references users(id) on delete cascade,
    day     date not null,
    primary key (user_id, day)
);

-- Indexes for the hot read paths (list view = items + reactions + comments).
create index if not exists idx_items_list        on items(list_id);
create index if not exists idx_reactions_item     on reactions(item_id);
create index if not exists idx_comments_item      on comments(item_id);
create index if not exists idx_list_members_user  on list_members(user_id);
