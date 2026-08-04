// Seed the Japan trip list from the trip-planning doc ("Loc - Japan").
// Usage: node db/seed-japan.mjs <owner-username>
// Idempotent-ish: refuses to run if a list with this name already exists.
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LIST_NAME = 'Japan — Feb 2027 🏔️♨️';

const ITEMS = [
    // 🏔️ resorts
    ['Niseko United', 'resort', 'Hokkaido — the famous one; deep, light powder, international scene'],
    ['Rusutsu', 'resort', 'Hokkaido — tree runs, near Niseko, quieter'],
    ['Furano', 'resort', 'Hokkaido — mellower, more local pow'],
    ['Hakuba Valley', 'resort', 'Nagano — 10 resorts, big alpine terrain, Olympic pedigree, ~easy from Tokyo'],
    ['Nozawa Onsen', 'resort', 'Nagano — resort AND classic onsen town (double duty)'],
    ['Myoko Kogen', 'resort', 'Niigata — huge snowfall, under-the-radar'],
    ['Zao Onsen', 'resort', 'Yamagata — "snow monsters" (frost-covered trees) + onsen on-mountain'],
    // ♨️ onsen
    ['Nozawa village baths', 'onsen', '13 free public baths in the village; ride by day, soak by night'],
    ['Zao sulfur springs', 'onsen', 'Sulfur springs below the snow-monster runs'],
    ['Jigokudani (Yamanouchi)', 'onsen', 'The snow-monkey onsen; day trip from Nagano'],
    ['Ginzan Onsen', 'onsen', 'Postcard Taishō-era street, dreamy in snow'],
    ['Kusatsu Onsen', 'onsen', "One of Japan's top-3 onsen towns (Gunma)"],
    // 🍜 food
    ['Sapporo miso ramen', 'food', 'Hokkaido staple'],
    ['Uni + Hokkaido seafood', 'food', 'If Hokkaido wins the region fork'],
    ['Jingisukan (Genghis Khan)', 'food', 'Hokkaido lamb BBQ'],
    ['Soba + oyaki', 'food', 'Nagano staples; apple everything'],
    ['Izakaya + yakitori après', 'food', 'Standing appointment after the lifts close'],
    ['Konbini runs + one proper kaiseki', 'food', 'The legendary lows and one deliberate high'],
];

const username = process.argv[2];
if (!username) {
    console.error('Usage: node db/seed-japan.mjs <owner-username>');
    process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let url = process.env.DATABASE_URL;
if (!url) {
    const env = readFileSync(join(root, '.env.local'), 'utf8');
    url = env.match(/^DATABASE_URL="?([^"\n]+)"?$/m)?.[1];
}
if (!url) {
    console.error('DATABASE_URL not set (env or .env.local)');
    process.exit(1);
}
const sql = neon(url);

const users = await sql`SELECT id FROM users WHERE username = ${username} LIMIT 1`;
if (users.length === 0) {
    console.error(`User "${username}" not found — sign up in the app first.`);
    process.exit(1);
}
const ownerId = users[0].id;

const existing = await sql`SELECT id FROM lists WHERE name = ${LIST_NAME} LIMIT 1`;
if (existing.length > 0) {
    console.error(`List "${LIST_NAME}" already exists (${existing[0].id}) — nothing to do.`);
    process.exit(1);
}

const [list] = await sql`
    INSERT INTO lists (name, kind, created_by) VALUES (${LIST_NAME}, 'travel', ${ownerId})
    RETURNING id`;
await sql`INSERT INTO list_members (list_id, user_id, role) VALUES (${list.id}, ${ownerId}, 'owner')`;

for (const [title, category, note] of ITEMS) {
    await sql`
        INSERT INTO items (list_id, title, category, note, created_by)
        VALUES (${list.id}, ${title}, ${category}, ${note}, ${ownerId})`;
    console.log(`ok: [${category}] ${title}`);
}
console.log(`\nSeeded "${LIST_NAME}" (${list.id}) with ${ITEMS.length} items, owner ${username}.`);
