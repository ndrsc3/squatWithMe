// Apply db/schema.sql to the database in DATABASE_URL (falls back to .env.local).
// Usage: node db/run-schema.mjs
//
// Vercel's buildCommand runs this before every deploy: preview builds apply the schema to
// the dev branch, the production build to production. Guard: it refuses to touch the
// production endpoint unless VERCEL_ENV=production (db/prod-endpoint.mjs, fail closed).
// Exports the split and the guard so db/run-schema.test.mjs can prove both.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isProductionUrl } from './prod-endpoint.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** schema.sql → statements. Full-line comments are dropped, then split on `;`. */
export function splitStatements(schema) {
    return schema
        .split('\n')
        .filter((line) => !line.trimStart().startsWith('--'))
        .join('\n')
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean);
}

/** Why this run must not proceed, or null when it may. */
export function refusal(url, vercelEnv) {
    if (!url) return 'DATABASE_URL not set (env or .env.local)';
    if (isProductionUrl(url) && vercelEnv !== 'production') {
        return `refusing: DATABASE_URL is (or cannot be proven not to be) production, and VERCEL_ENV is ${vercelEnv ?? 'unset'}`;
    }
    return null;
}

function databaseUrl() {
    if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
    try {
        const env = readFileSync(join(root, '.env.local'), 'utf8');
        return env.match(/^DATABASE_URL="?([^"\n]+)"?$/m)?.[1];
    } catch {
        return undefined; // no .env.local
    }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    const url = databaseUrl();
    const why = refusal(url, process.env.VERCEL_ENV);
    if (why) {
        console.error(`run-schema: ${why}`);
        process.exit(1);
    }
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(url);
    const statements = splitStatements(readFileSync(join(root, 'db', 'schema.sql'), 'utf8'));
    for (const statement of statements) {
        await sql.query(statement);
        console.log(`ok: ${statement.replace(/\s+/g, ' ').slice(0, 60)}`);
    }
    console.log(`\n${statements.length} statements applied (VERCEL_ENV=${process.env.VERCEL_ENV ?? 'local'}).`);
}
