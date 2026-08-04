// One-off backfill for the seeded Japan items (created before region/image_url existed).
// For each item: try candidate URLs in order; first one that responds OK wins →
// set url (+ og:image when found) + region. No candidate validates → DELETE the item
// (owner rule 260804: entries must carry a validated link).
// Usage: node db/backfill-japan.mjs [--dry-run]
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLAN = {
    'Niseko United': { region: 'Hokkaido', urls: ['https://www.niseko.ne.jp/en/'], imageUrls: ['https://en.wikipedia.org/wiki/Niseko_United', 'https://en.wikipedia.org/wiki/Niseko,_Hokkaido'] },
    'Rusutsu': { region: 'Hokkaido', urls: ['https://rusutsu.com/', 'https://rusutsu.com/en/'] },
    'Furano': { region: 'Hokkaido', urls: ['https://www.princehotels.com/en/ski/furano/', 'https://www.snowfurano.com/'], imageUrls: ['https://en.wikipedia.org/wiki/Furano_Ski_Resort', 'https://en.wikipedia.org/wiki/Furano,_Hokkaido'] },
    'Hakuba Valley': { region: 'Nagano', urls: ['https://www.hakubavalley.com/en/', 'https://www.hakubavalley.com/'], imageUrls: ['https://en.wikipedia.org/wiki/Hakuba,_Nagano'] },
    'Nozawa Onsen': { region: 'Nagano', urls: ['https://en.nozawaski.com/', 'https://www.nozawaski.com/'], imageUrls: ['https://en.wikipedia.org/wiki/Nozawa_Onsen_Snow_Resort', 'https://en.wikipedia.org/wiki/Nozawaonsen,_Nagano'] },
    'Myoko Kogen': { region: 'Niigata', urls: ['https://www.myokotourism.jp/', 'https://myokokogen.net/'] },
    'Zao Onsen': { region: 'Yamagata', urls: ['https://zao-ski.or.jp/', 'http://www.zao-ski.or.jp/', 'https://www.zao-spa.or.jp/'], imageUrls: ['https://en.wikipedia.org/wiki/Za%C5%8D_Onsen'] },
    'Nozawa village baths': { region: 'Nagano', urls: ['https://nozawakanko.jp/en/', 'https://nozawakanko.jp/'] },
    'Zao sulfur springs': { region: 'Yamagata', urls: ['https://www.zao-spa.or.jp/', 'http://www.zao-spa.or.jp/'], imageUrls: ['https://en.wikipedia.org/wiki/Za%C5%8D_Onsen'] },
    'Jigokudani (Yamanouchi)': { region: 'Nagano', urls: ['https://en.jigokudani-yaen.co.jp/', 'https://jigokudani-yaen.co.jp/', 'https://en.wikipedia.org/wiki/Jigokudani_Monkey_Park'] },
    'Ginzan Onsen': { region: 'Yamagata', urls: ['https://www.ginzanonsen.jp/'] },
    'Kusatsu Onsen': { region: 'Gunma', urls: ['https://www.kusatsu-onsen.ne.jp/guide/en/', 'https://www.visit-gunma.jp/en/spots/kusatsu-onsen/'], imageUrls: ['https://en.wikipedia.org/wiki/Kusatsu,_Gunma'] },
    'Sapporo miso ramen': { region: 'Hokkaido', urls: ['https://en.wikipedia.org/wiki/Sapporo_ramen', 'https://en.wikipedia.org/wiki/Ramen'] },
    'Uni + Hokkaido seafood': { region: 'Hokkaido', urls: ['https://en.wikipedia.org/wiki/Sea_urchin_as_food', 'https://en.wikipedia.org/wiki/Sea_urchin'] },
    'Jingisukan (Genghis Khan)': { region: 'Hokkaido', urls: ['https://en.wikipedia.org/wiki/Jingisukan'] },
    'Soba + oyaki': { region: 'Nagano', urls: ['https://en.wikipedia.org/wiki/Soba'] },
    'Izakaya + yakitori après': { region: 'Anywhere', urls: ['https://en.wikipedia.org/wiki/Izakaya'] },
    'Konbini runs + one proper kaiseki': { region: 'Anywhere', urls: ['https://en.wikipedia.org/wiki/Kaiseki'] },
};

const dryRun = process.argv.includes('--dry-run');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    const env = readFileSync(join(root, '.env.local'), 'utf8');
    dbUrl = env.match(/^DATABASE_URL="?([^"\n]+)"?$/m)?.[1];
}
const sql = neon(dbUrl);

async function probe(pageUrl) {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(pageUrl, {
            signal: controller.signal,
            redirect: 'follow',
            headers: { 'user-agent': 'Mozilla/5.0 (compatible; squatwithme/2.0)' },
        });
        clearTimeout(timer);
        if (!res.ok) return null;
        const html = (await res.text()).slice(0, 400_000);
        const match =
            html.match(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i) ??
            html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
        let image = match?.[1] ?? null;
        if (image && !/^https?:\/\//.test(image)) {
            try { image = new URL(image, res.url).href; } catch { image = null; }
        }
        return { finalUrl: res.url, image };
    } catch {
        return null;
    }
}

const lists = await sql`SELECT id FROM lists WHERE name LIKE 'Japan%' LIMIT 1`;
if (lists.length === 0) { console.error('Japan list not found'); process.exit(1); }
const items = await sql`SELECT id, title FROM items WHERE list_id = ${lists[0].id}`;

let updated = 0, removed = 0, skipped = 0;
for (const item of items) {
    const plan = PLAN[item.title];
    if (!plan) { console.log(`SKIP (no plan): ${item.title}`); skipped++; continue; }

    let hit = null;
    for (const candidate of plan.urls) {
        hit = await probe(candidate);
        if (hit) { hit.tried = candidate; break; }
    }
    if (!hit) {
        console.log(`REMOVE (no valid url): ${item.title}`);
        if (!dryRun) await sql`DELETE FROM items WHERE id = ${item.id}`;
        removed++;
        continue;
    }
    // Official site validated but has no og:image → borrow one from a fallback page (wiki).
    if (!hit.image && plan.imageUrls) {
        for (const candidate of plan.imageUrls) {
            const alt = await probe(candidate);
            if (alt?.image) { hit.image = alt.image; break; }
        }
    }
    console.log(`OK: ${item.title} → ${hit.tried}  img:${hit.image ? 'yes' : 'no'}  region:${plan.region}`);
    if (!dryRun) {
        await sql`
            UPDATE items SET url = ${hit.tried}, image_url = ${hit.image}, region = ${plan.region}
            WHERE id = ${item.id}`;
    }
    updated++;
}
console.log(`\n${dryRun ? '[DRY RUN] ' : ''}updated:${updated} removed:${removed} skipped:${skipped} of ${items.length}`);
