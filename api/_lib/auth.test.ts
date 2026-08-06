import { describe, it, expect, beforeAll } from 'vitest';
import { hashPassword, verifyPassword, signToken, verifyToken } from './auth.js';

beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-not-for-production';
});

describe('password hashing', () => {
    it('verifies a correct password', () => {
        expect(verifyPassword('hunter2', hashPassword('hunter2'))).toBe(true);
    });

    it('rejects a wrong password', () => {
        expect(verifyPassword('nope', hashPassword('hunter2'))).toBe(false);
    });

    it('uses a random salt (same input → different hash)', () => {
        expect(hashPassword('x')).not.toBe(hashPassword('x'));
    });

    it('rejects a malformed stored hash', () => {
        expect(verifyPassword('x', 'garbage')).toBe(false);
    });
});

describe('JWT', () => {
    it('round-trips a payload', async () => {
        const token = await signToken({ userId: 'u1', username: 'nik' });
        expect(await verifyToken(token)).toEqual({ userId: 'u1', username: 'nik' });
    });

    it('rejects a tampered token', async () => {
        const token = await signToken({ userId: 'u1', username: 'nik' });
        expect(await verifyToken(token + 'tampered')).toBeNull();
    });

    it('rejects garbage', async () => {
        expect(await verifyToken('not.a.jwt')).toBeNull();
    });
});
