// Preflight for local dev — `npm run dev:full` runs this, then `vercel dev`.
//
// Each check names the exact fix. Hard checks stop the run; the Node version only warns
// (this host may run a newer Node than the deployed one, with no version manager).
// Exports the checks so scripts/dev-check.test.mjs can prove each one fails on a broken input.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isProductionUrl } from '../db/prod-endpoint.mjs';

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

/** KEY=value lines → { KEY: value }, quotes stripped. */
export function parseEnv(text) {
    const env = {};
    for (const line of text.split('\n')) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
        if (m) env[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1');
    }
    return env;
}

/** Installed packages match the lockfile (optional platform builds skipped). */
export function checkModules(root) {
    const hidden = join(root, 'node_modules', '.package-lock.json');
    if (!existsSync(hidden)) return { ok: false, msg: 'node_modules missing', fix: 'npm ci' };
    const want = readJson(join(root, 'package-lock.json')).packages;
    const have = readJson(hidden).packages;
    const stale = Object.entries(want)
        .filter(([path, p]) => path && !p.optional && !p.link && have[path]?.version !== p.version)
        .map(([path]) => path.replace(/^node_modules\//, ''));
    return stale.length
        ? { ok: false, msg: `node_modules out of date (${stale.slice(0, 3).join(', ')}${stale.length > 3 ? ', …' : ''})`, fix: 'npm ci' }
        : { ok: true, msg: 'node_modules match the lockfile' };
}

export function checkLinked(root) {
    return existsSync(join(root, '.vercel', 'project.json'))
        ? { ok: true, msg: 'linked to Vercel' }
        : { ok: false, msg: 'not linked to a Vercel project', fix: 'vercel link   # pick app-squatwithme' };
}

/** .env.local exists, holds every key named in .env.example, and its DB isn't production. */
export function checkEnv(root, prodId) {
    const fix = 'vercel env pull .env.local';
    const local = join(root, '.env.local');
    if (!existsSync(local)) return [{ ok: false, msg: '.env.local missing', fix }];
    const env = parseEnv(readFileSync(local, 'utf8'));
    const missing = Object.keys(parseEnv(readFileSync(join(root, '.env.example'), 'utf8'))).filter((k) => !env[k]);
    const results = [
        missing.length
            ? { ok: false, msg: `.env.local missing ${missing.join(', ')}`, fix }
            : { ok: true, msg: '.env.local has every key in .env.example' },
    ];
    if (env.DATABASE_URL) {
        results.push(
            isProductionUrl(env.DATABASE_URL, prodId)
                ? {
                      ok: false,
                      msg: 'DATABASE_URL is (or cannot be proven not to be) the production database',
                      fix: 'point Development-scope DATABASE_URL at the dev branch, then: vercel env pull .env.local',
                  }
                : { ok: true, msg: 'DATABASE_URL is not production' },
        );
    }
    return results;
}

export function checkNode(root, version = process.versions.node) {
    const want = readFileSync(join(root, '.nvmrc'), 'utf8').trim();
    return version.split('.')[0] === want
        ? { ok: true, msg: `Node ${version}` }
        : { ok: true, warn: true, msg: `Node ${version}; production runs ${want}.x — fine for dev, but CI is the authority` };
}

export function runChecks(root, prodId) {
    return [checkNode(root), checkModules(root), checkLinked(root), ...checkEnv(root, prodId)];
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const results = runChecks(root);
    for (const r of results) {
        console.log(`${r.ok ? (r.warn ? '!' : '✓') : '✗'} ${r.msg}`);
        if (!r.ok) console.log(`    fix: ${r.fix}`);
    }
    if (results.some((r) => !r.ok)) {
        console.error('\ndev-check failed — fix the above, then rerun `npm run dev:full`.');
        process.exit(1);
    }
}
