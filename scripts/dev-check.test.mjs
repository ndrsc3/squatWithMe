import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkEnv, checkLinked, checkModules, checkNode, parseEnv } from './dev-check.mjs';
import { endpointId, isProductionUrl } from '../db/prod-endpoint.mjs';

const PROD = 'ep-prod-thing-12345678';
const url = (host) => `postgresql://u:p@${host}.us-east-2.aws.neon.tech/neondb?sslmode=require`;

/** A fixture repo that passes every check; each test then breaks one thing. */
function repo({ lock, installed, linked = true, envLocal, nvmrc = '24' } = {}) {
    const root = mkdtempSync(join(tmpdir(), 'dev-check-'));
    const pkgs = { '': {}, 'node_modules/vite': { version: '6.4.3' }, 'node_modules/@esbuild/linux-x64': { version: '0.25.0', optional: true } };
    writeFileSync(join(root, 'package-lock.json'), JSON.stringify({ packages: lock ?? pkgs }));
    if (installed !== null) {
        mkdirSync(join(root, 'node_modules'));
        const have = installed ?? { 'node_modules/vite': { version: '6.4.3' } };
        writeFileSync(join(root, 'node_modules', '.package-lock.json'), JSON.stringify({ packages: have }));
    }
    if (linked) {
        mkdirSync(join(root, '.vercel'));
        writeFileSync(join(root, '.vercel', 'project.json'), '{}');
    }
    writeFileSync(join(root, '.env.example'), 'DATABASE_URL=\nJWT_SECRET=\n');
    if (envLocal !== null) writeFileSync(join(root, '.env.local'), envLocal ?? `DATABASE_URL="${url('ep-dev-branch-87654321')}"\nJWT_SECRET="x"\n`);
    writeFileSync(join(root, '.nvmrc'), `${nvmrc}\n`);
    return root;
}

describe('prod-endpoint', () => {
    it('reads the endpoint id from direct and pooled hosts alike', () => {
        expect(endpointId(url(PROD))).toBe(PROD);
        expect(endpointId(url(`${PROD}-pooler`))).toBe(PROD);
    });
    it('flags production in both host forms', () => {
        expect(isProductionUrl(url(PROD), PROD)).toBe(true);
        expect(isProductionUrl(url(`${PROD}-pooler`), PROD)).toBe(true);
        expect(isProductionUrl(url('ep-dev-branch-87654321'), PROD)).toBe(false);
    });
    it('fails closed: unset prod id, garbage or non-Neon URL all count as production', () => {
        expect(isProductionUrl(url('ep-dev-branch-87654321'), null)).toBe(true);
        expect(isProductionUrl('not a url', PROD)).toBe(true);
        expect(isProductionUrl('postgresql://u:p@localhost/db', PROD)).toBe(true);
    });
});

describe('dev-check', () => {
    it('passes on a healthy repo', () => {
        const root = repo();
        expect(checkModules(root).ok).toBe(true);
        expect(checkLinked(root).ok).toBe(true);
        expect(checkEnv(root, PROD).every((r) => r.ok)).toBe(true);
    });
    it('fails on missing node_modules', () => {
        expect(checkModules(repo({ installed: null })).ok).toBe(false);
    });
    it('fails on a stale install, but ignores optional platform builds', () => {
        const stale = checkModules(repo({ installed: { 'node_modules/vite': { version: '5.0.0' } } }));
        expect(stale.ok).toBe(false);
        expect(stale.msg).toContain('vite');
    });
    it('fails when not linked to Vercel', () => {
        expect(checkLinked(repo({ linked: false })).ok).toBe(false);
    });
    it('fails on missing .env.local, or a missing key', () => {
        expect(checkEnv(repo({ envLocal: null }), PROD)[0].ok).toBe(false);
        const [keys] = checkEnv(repo({ envLocal: `DATABASE_URL="${url('ep-dev-branch-87654321')}"\n` }), PROD);
        expect(keys.ok).toBe(false);
        expect(keys.msg).toContain('JWT_SECRET');
    });
    it('fails when DATABASE_URL is production, pooled or direct', () => {
        for (const host of [PROD, `${PROD}-pooler`]) {
            const results = checkEnv(repo({ envLocal: `DATABASE_URL="${url(host)}"\nJWT_SECRET="x"\n` }), PROD);
            expect(results.find((r) => r.msg.startsWith('DATABASE_URL')).ok).toBe(false);
        }
    });
    it('only warns on a Node mismatch', () => {
        const r = checkNode(repo(), '25.8.1');
        expect(r.ok).toBe(true);
        expect(r.warn).toBe(true);
        expect(checkNode(repo(), '24.1.0').warn).toBeUndefined();
    });
    it('parses quoted and bare env values', () => {
        expect(parseEnv('A="1"\nB=2\n# c\n')).toEqual({ A: '1', B: '2' });
    });
});
