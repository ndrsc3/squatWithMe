import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PROD_ENDPOINT_ID } from './prod-endpoint.mjs';
import { refusal, splitStatements } from './run-schema.mjs';

const url = (host) => `postgresql://u:p@${host}.us-east-2.aws.neon.tech/neondb?sslmode=require`;
const PROD = url(`${PROD_ENDPOINT_ID}-pooler`);
const DEV = url('ep-dev-branch-87654321-pooler');

describe('run-schema guard', () => {
    it('refuses production outside a production build', () => {
        for (const env of [undefined, 'preview', 'development']) expect(refusal(PROD, env)).toMatch(/refusing/);
        expect(refusal(url(PROD_ENDPOINT_ID), 'preview')).toMatch(/refusing/);
    });
    it('refuses an unreadable URL outside production (fail closed)', () => {
        expect(refusal('postgresql://u:p@localhost/db', 'preview')).toMatch(/refusing/);
    });
    it('refuses a missing URL', () => {
        expect(refusal(undefined, 'production')).toMatch(/not set/);
    });
    it('allows production in a production build, and dev anywhere', () => {
        expect(refusal(PROD, 'production')).toBeNull();
        expect(refusal(DEV, 'preview')).toBeNull();
        expect(refusal(DEV, undefined)).toBeNull();
    });
});

describe('schema.sql runs on every deploy', () => {
    const statements = splitStatements(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
    it('every statement is re-runnable', () => {
        expect(statements.length).toBeGreaterThan(0);
        for (const s of statements) expect(s, s.slice(0, 60)).toMatch(/\bif not exists\b/i);
    });
    it('the split drops full-line comments and keeps statements whole', () => {
        expect(splitStatements('-- a; b\ncreate table if not exists t (x int);\n')).toEqual([
            'create table if not exists t (x int)',
        ]);
    });
});
