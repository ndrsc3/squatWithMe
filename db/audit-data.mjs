// One-shot data audit (read-only): row counts, form checks, orphans, geocode sanity.
// Usage: node db/audit-data.mjs   (env from .env.local like run-schema.mjs)
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let url = process.env.DATABASE_URL;
if (!url) {
    const env = readFileSync(join(root, '.env.local'), 'utf8');
    url = env.match(/^DATABASE_URL="?([^"\n]+)"?$/m)?.[1];
}
const sql = neon(url);

const out = {};

out.counts = (
    await sql`select 'users' t, count(*) n from users
    union all select 'lists', count(*) from lists
    union all select 'list_members', count(*) from list_members
    union all select 'items', count(*) from items
    union all select 'reactions', count(*) from reactions
    union all select 'comments', count(*) from comments
    union all select 'squats', count(*) from squats order by 1`
);

out.users = await sql`select id, username, display_name, created_at::date d from users order by created_at`;
out.lists = await sql`select id, name, kind, created_at::date d from lists order by created_at`;
out.members = await sql`select l.name list, u.username from list_members m
    join lists l on l.id = m.list_id join users u on u.id = m.user_id order by 1, 2`;

out.items = await sql`select i.id, i.title, i.category, i.region, l.name list,
    (i.url is not null) has_url, (i.image_url is not null) has_img,
    i.lat, i.lng, i.near_item_id, length(coalesce(i.note,'')) note_len,
    u.username added_by, i.created_at::date d
    from items i join lists l on l.id = i.list_id join users u on u.id = i.created_by
    order by i.created_at`;

out.badCategory = await sql`select id, title, category from items
    where category not in ('resort','onsen','food','other')`;

out.geoOutOfJapan = await sql`select id, title, region, lat, lng from items
    where lat is not null and (lat < 24 or lat > 46 or lng < 123 or lng > 146)`;

out.geoMissing = await sql`select id, title, region from items where lat is null`;

out.whitespace = await sql`select id, title from items
    where title <> trim(title) or region <> trim(region) or region = ''`;

out.reactions = await sql`select emoji, count(*) n from reactions group by 1`;
out.comments = await sql`select c.id, u.username, left(c.body, 40) body, c.created_at::date d
    from comments c join users u on u.id = c.user_id order by c.created_at`;

out.squats = await sql`select u.username, count(*) days, min(s.day) first, max(s.day) last
    from squats s join users u on u.id = s.user_id group by 1 order by 2 desc`;
out.squatsFuture = await sql`select u.username, s.day from squats s
    join users u on u.id = s.user_id where s.day > current_date`;
out.squatsPreRelaunch = await sql`select u.username, s.day from squats s
    join users u on u.id = s.user_id where s.day < '2026-08-03' order by s.day`;

// orphan checks (FKs should prevent; verify)
out.orphans = await sql`
    select 'items->list' k, count(*) n from items i left join lists l on l.id = i.list_id where l.id is null
    union all select 'reactions->item', count(*) from reactions r left join items i on i.id = r.item_id where i.id is null
    union all select 'comments->item', count(*) from comments c left join items i on i.id = c.item_id where i.id is null
    union all select 'members->user', count(*) from list_members m left join users u on u.id = m.user_id where u.id is null
    union all select 'near->item', count(*) from items i left join items t on t.id = i.near_item_id where i.near_item_id is not null and t.id is null`;

for (const [k, v] of Object.entries(out)) {
    console.log(`\n== ${k} (${v.length})`);
    console.table(v);
}
