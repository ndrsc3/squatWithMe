// Seed the Japan trip list with the verified place set.
//
// Every entry is a SPECIFIC place — a named ski resort, a bathable onsen open to day
// visitors, or a real restaurant — carrying a live official url, a postal address, and
// base-area coordinates. That is the admission bar (owner rule 260804); an entry that
// cannot clear it does not go in.
//
// The 260804 audit replaced the original generated seed, in which all 18 entries had a
// defect: six were dish names linked to Wikipedia, two onsen pointed at water you cannot
// bathe in (the Jigokudani macaque pool; Zao's winter-closed Dai-rotenburo), two urls had
// gone stale behind silent 301s, and every coordinate was a Nominatim area centroid or a
// same-named railway station rather than a lift base. Findings + what could NOT be verified:
// _underScore/work/explorations/260804-japan-list-credibility-audit.md
//
// Coordinates are named lift terminals / OSM facility nodes — NOT Nominatim place lookups.
// Food is deliberately absent: it is human-entered by the crew. The verified restaurant
// pool lives in vault-Notes "Travel/Loc - Japan.md".
//
// Usage: node db/seed-japan.mjs <owner-username>
// Refuses to run if a list with this name already exists.
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LIST_NAME = 'Japan - Winter 2027';

const ITEMS = [
    {"title":"Akakura Onsen (Myoko Kogen)","category":"resort","region":"Niigata","url":"https://akakura-ski.com/english/","address":"Akakura Onsen, Myoko City, Niigata 949-2111, Japan","imageUrl":"https://myokotourism.jp/wp-content/uploads/2021/11/いもり池-2.jpg","note":"Niigata — huge snowfall (13–14 m/yr), under-the-radar. Largest of Myoko Kogen's five separate ski areas (14 lifts), the lodging hub, lift-linked to Akakura Kanko on a joint pass, and the only one with night skiing. 100% natural snow, no snowmaking. Note Suginohara is the Ikon one, not this.","lat":36.896459,"lng":138.175545},
    {"title":"Furano","category":"resort","region":"Hokkaido","url":"https://www.princehotels.com/en/ski/furano/","address":"Nakagoryo, Furano-shi, Hokkaido 076-8511, Japan","imageUrl":"https://upload.wikimedia.org/wikipedia/commons/3/3c/Furano_ski.jpg","note":"Hokkaido — mellower, more local pow. On Ikon since winter 2025. Pin is the Furano Ropeway base; Kitanomine gondola is the second base.","lat":43.325468,"lng":142.353444},
    {"title":"Hakuba Valley","category":"resort","region":"Nagano","url":"https://www.hakubavalley.com/en/","address":"Happo 4258, Oaza Hokujo, Hakuba-mura, Kitaazumi-gun, Nagano 399-9301, Japan","imageUrl":"https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Hakuba_Happo-one_Winter_Resort.JPG/1280px-Hakuba_Happo-one_Winter_Resort.JPG?utm_source=en.wikipedia.org&amp;utm_campaign=index&amp;utm_content=thumbnail","note":"Nagano — 10 resorts on one pass, big alpine terrain, Olympic pedigree, ~easy from Tokyo. Pin is the Happo-One Adam gondola base. Adam retires after the 2027 season — Feb 2027 is its last.","lat":36.701791,"lng":137.836828},
    {"title":"Niseko United","category":"resort","region":"Hokkaido","url":"https://www.niseko.ne.jp/en/","address":"Niseko Hirafu 1-jo 2-chome 9-1, Kutchan-cho, Abuta-gun, Hokkaido 044-0080, Japan","imageUrl":"https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Niseko_United_Ski_Resort_in_Hokkaido_Japan.jpg/1280px-Niseko_United_Ski_Resort_in_Hokkaido_Japan.jpg?utm_source=en.wikipedia.org&amp;utm_campaign=index&amp;utm_content=thumbnail","note":"Hokkaido — the famous one; deep, light powder, international scene. Four linked areas; pin is the Grand Hirafu Ace Gondola base. New Mori-no Gondola at Niseko Village opens 2026/27.","lat":42.861452,"lng":140.697767},
    {"title":"Nozawa Onsen","category":"resort","region":"Nagano","url":"https://en.nozawaski.com/","address":"7653 Toyosato, Nozawaonsen-mura, Shimotakai-gun, Nagano 389-2502, Japan","imageUrl":"https://upload.wikimedia.org/wikipedia/commons/e/eb/Nozawa_Ski.jpg?utm_source=en.wikipedia.org&amp;utm_campaign=index&amp;utm_content=thumbnail_unscaled","note":"Nagano — resort AND classic onsen town (double duty). 16 lifts. Pin is the Nagasaka Gondola base at the Center House.","lat":36.920095,"lng":138.452555},
    {"title":"Rusutsu","category":"resort","region":"Hokkaido","url":"https://rusutsu.com/en/","address":"13 Izumikawa, Rusutsu-mura, Abuta-gun, Hokkaido 048-1711, Japan","imageUrl":"https://rusutsu.com/assets/img/common/ogp.jpg","note":"Hokkaido — tree runs, near Niseko, quieter. Pin is the West Gondola base at the hotel complex.","lat":42.749229,"lng":140.899569},
    {"title":"Zao Onsen","category":"resort","region":"Yamagata","url":"https://zaomountainresort.com/ski/","address":"229-3 Sandogawa, Zao Onsen, Yamagata-shi, Yamagata 990-2301, Japan","imageUrl":"https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/220430_ZaoOnsen_Yamagata_Yamagata_pref_Japan02s3.jpg/1280px-220430_ZaoOnsen_Yamagata_Yamagata_pref_Japan02s3.jpg?utm_source=en.wikipedia.org&amp;utm_campaign=index&amp;utm_content=thumbnail","note":"Yamagata — \"snow monsters\" (frost-covered trees) + onsen on-mountain. On Ikon for 2026/27. Pin is the Zao Ropeway Sanroku base station.","lat":38.161672,"lng":140.395175},
    {"title":"Jigokudani Onsen Korakukan","category":"onsen","region":"Nagano","url":"http://www.jigokudanionsen.com/","address":"6818 Hirao, Yamanouchi-machi, Shimotakai-gun, Nagano 381-0401, Japan","imageUrl":"http://www.jigokudanionsen.com/wp/wp-content/themes/jigokudanionsen/images/og-image.jpg","note":"The original snow-monkey bath — day-use ¥1,500, riverside mixed rotenburo, monkeys still visit early. NOT the monkey park, whose pool is monkeys-only. Winter = 30-min walk in from Kanbayashi, no car access. Call 0269-33-4376 for day-use hours.","lat":36.73276,"lng":138.4611802},
    {"title":"Sainokawara Rotemburo (Kusatsu)","category":"onsen","region":"Gunma","url":"https://onsen-kusatsu.com/sainokawara/","address":"521-3 Oaza Kusatsu, Kusatsu-machi, Agatsuma-gun, Gunma 377-1711, Japan","imageUrl":"https://onsen-kusatsu.com/common/img/ogp.jpg","note":"~500 m² open-air bath in a gorge, snow-viewing — the big one in Japan's top-3 onsen town. ¥800, winter hours 9:00–20:00. Route 292 from Shiga Kogen is shut late Nov–mid Apr, so it's a southern detour via Ueda in February.","lat":36.6242517,"lng":138.5883188},
    {"title":"Shinzaemon-no-yu (Zao Onsen)","category":"onsen","region":"Yamagata","url":"https://zaospa.co.jp/","address":"905 Zao-onsen Kawamae, Yamagata-shi, Yamagata 990-2301, Japan","imageUrl":"https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/220430_ZaoOnsen_Yamagata_Yamagata_pref_Japan02s3.jpg/1280px-220430_ZaoOnsen_Yamagata_Yamagata_pref_Japan02s3.jpg?utm_source=en.wikipedia.org&amp;utm_campaign=index&amp;utm_content=thumbnail","note":"Year-round day-use with a 100%-source open-air bath in Zao's strong-acid sulfur water. ¥1,000, late on weekends. Replaces the Dai-rotenburo, which officially closes for winter. Cheap alt: the ¥200 Kawara-yu, where water wells up through the tub floor.","lat":38.1644971,"lng":140.3948432},
    {"title":"Shirogane-yu (Ginzan Onsen)","category":"onsen","region":"Yamagata","url":"https://www.city.obanazawa.yamagata.jp/kanko/kankochi/1346","address":"415-1 Ginzan-shinhata-kita, Obanazawa-shi, Yamagata 999-4333, Japan","imageUrl":"https://www.ginzanonsen.jp/ogp.jpg","note":"The one real public bath on Ginzan's Taisho-era street — Kengo Kuma building, ¥500, 9:00–16:00, year-round. Bring a towel. Winter is park-and-ride from Taisho Roman-kan; 2026/27 dates unpublished.","lat":38.5709811,"lng":140.5303753},
    {"title":"Ōyu (Nozawa Onsen)","category":"onsen","region":"Nagano","url":"https://nozawakanko.jp/hotspring/","address":"9328 Toyosato, Nozawaonsen-mura, Shimotakai-gun, Nagano 389-2502, Japan","imageUrl":"https://nozawakanko.jp/wp/wp-content/uploads/2025/02/ogp.jpg","note":"Flagship of Nozawa's 13 free sotoyu, run by residents since the Edo period. 6:00–23:00 in winter, donation only. Bring towel + soap — nothing supplied. Don't cool the water; use the paddle.","lat":36.923197,"lng":138.4482917},
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

for (const item of ITEMS) {
    await sql`
        INSERT INTO items (list_id, title, category, region, url, address, image_url, note, lat, lng, created_by)
        VALUES (${list.id}, ${item.title}, ${item.category}, ${item.region}, ${item.url},
                ${item.address}, ${item.imageUrl}, ${item.note}, ${item.lat}, ${item.lng}, ${ownerId})`;
    console.log(`ok: [${item.category}] ${item.title}`);
}
console.log(`\nSeeded "${LIST_NAME}" (${list.id}) with ${ITEMS.length} items, owner ${username}.`);
