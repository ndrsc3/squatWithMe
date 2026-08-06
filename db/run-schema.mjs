// Apply db/schema.sql to the database in DATABASE_URL (falls back to .env.local).
// Idempotent — the schema is all `create ... if not exists`. Usage: node db/run-schema.mjs
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

let url = process.env.DATABASE_URL;
if (!url) {
    try {
        const env = readFileSync(join(root, '.env.local'), 'utf8');
        url = env.match(/^DATABASE_URL="?([^"\n]+)"?$/m)?.[1];
    } catch {
        /* no .env.local */
    }
}
if (!url) {
    console.error('DATABASE_URL not set (env or .env.local)');
    process.exit(1);
}

const sql = neon(url);
const schema = readFileSync(join(root, 'db', 'schema.sql'), 'utf8');
const statements = schema
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

for (const statement of statements) {
    const label = statement.replace(/\s+/g, ' ').slice(0, 60);
    await sql.query(statement);
    console.log(`ok: ${label}`);
}
console.log(`\n${statements.length} statements applied.`);
