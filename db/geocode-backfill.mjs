// Geocode every item that has no coordinates yet (OSM Nominatim, 1 req/s policy).
// Query = address, else "title, region" (region "Anywhere"/empty → title alone).
// Usage: node db/geocode-backfill.mjs [--dry-run]
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dryRun = process.argv.includes('--dry-run');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    const env = readFileSync(join(root, '.env.local'), 'utf8');
    dbUrl = env.match(/^DATABASE_URL="?([^"\n]+)"?$/m)?.[1];
}
const sql = neon(dbUrl);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function geocode(query) {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
            { headers: { 'user-agent': 'squatwithme/2.0 (friends trip planner)' } },
        );
        if (!res.ok) return null;
        const data = await res.json();
        const hit = data[0];
        if (!hit) return null;
        const lat = parseFloat(hit.lat);
        const lng = parseFloat(hit.lon);
        return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng, name: hit.display_name } : null;
    } catch {
        return null;
    }
}

const items = await sql`
    SELECT id, title, region, address FROM items WHERE lat IS NULL ORDER BY title`;
console.log(`${items.length} items without coordinates\n`);

let hits = 0, misses = 0;
for (const item of items) {
    const region = item.region && item.region.toLowerCase() !== 'anywhere' ? `, ${item.region}` : '';
    const query = item.address || `${item.title}${region}`;
    const geo = await geocode(query);
    if (geo) {
        console.log(`OK: ${item.title}  →  (${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)})  [${geo.name.slice(0, 60)}]`);
        if (!dryRun) await sql`UPDATE items SET lat = ${geo.lat}, lng = ${geo.lng} WHERE id = ${item.id}`;
        hits++;
    } else {
        console.log(`MISS: ${item.title}  (query: "${query}")`);
        misses++;
    }
    await sleep(1100);
}
console.log(`\n${dryRun ? '[DRY RUN] ' : ''}geocoded:${hits} missed:${misses}`);
