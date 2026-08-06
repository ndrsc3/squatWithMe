// Runtime-load gate for the serverless functions.
//
// typecheck + lint + test + build all stayed GREEN while every /api/* route returned 500
// in production (260804). Twice. Static checks cannot see this class: none of them ever
// loads a function under the Node ESM runtime that actually serves it.
//
// Two real failures this catches, both of which shipped:
//   1. package.json missing "type": "module" → the emitted ESM is parsed as CommonJS
//      → SyntaxError: Cannot use import statement outside a module
//   2. extensionless relative imports (`./_lib/auth`) → tsconfig moduleResolution
//      "bundler" permits them and tsc rewrites nothing on emit, so Node's ESM resolver
//      fails → ERR_MODULE_NOT_FOUND
//
// Method: emit api/ with tsc exactly as written, then actually `import()` each entrypoint
// under Node. No secrets needed — db.ts is lazily initialized and auth.ts reads
// JWT_SECRET inside a function, so module load touches no environment.
//
// Usage: npm run smoke
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, '.smoke');

// Asserted explicitly, NOT left to the import() below, because the load check is
// Node-version dependent here: Node 22+ auto-detects ESM syntax in .js files with no
// "type" field, so a modern local Node happily loads what Vercel's runtime rejects with
// "Cannot use import statement outside a module". Verified 260804 — dropping the field
// still passed 11/11 on Node 25 while production was 500ing on exactly that.
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (pkg.type !== 'module') {
    console.error('✗ smoke: package.json must declare "type": "module".');
    console.error('  Without it Node parses the emitted ESM as CommonJS and every function');
    console.error('  500s with: SyntaxError: Cannot use import statement outside a module');
    process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });

try {
    execFileSync('npx', ['tsc', '-p', 'tsconfig.smoke.json'], { cwd: root, stdio: 'inherit' });
} catch {
    console.error('\n✗ smoke: tsc emit failed');
    process.exit(1);
}

// Entrypoints are the top-level files; _lib/ is shared plumbing pulled in transitively.
const entrypoints = readdirSync(outDir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.js'))
    .map((e) => e.name)
    .sort();

if (entrypoints.length === 0) {
    console.error('✗ smoke: no emitted entrypoints found — did tsconfig.smoke.json stop matching api/?');
    process.exit(1);
}

let failed = 0;
for (const name of entrypoints) {
    try {
        const mod = await import(pathToFileURL(join(outDir, name)).href);
        if (typeof mod.default !== 'function') {
            console.error(`✗ ${name} — loads, but has no default-exported handler`);
            failed++;
            continue;
        }
        console.log(`✓ ${name}`);
    } catch (error) {
        console.error(`✗ ${name} — ${error.code ?? 'load failed'}: ${error.message.split('\n')[0]}`);
        failed++;
    }
}

rmSync(outDir, { recursive: true, force: true });

console.log(`\n${entrypoints.length - failed}/${entrypoints.length} functions load under the Node runtime`);
if (failed > 0) {
    console.error('✗ smoke FAILED — these would 500 on every request in production');
    process.exit(1);
}
