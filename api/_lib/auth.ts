import type { VercelRequest } from '@vercel/node';
import crypto from 'crypto';
import { SignJWT, jwtVerify } from 'jose';

const SCRYPT_KEYLEN = 64;

/** scrypt password hash, stored as `salt:derivedHex`. No native deps. */
export function hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
    return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
    const [salt, derivedHex] = stored.split(':');
    if (!salt || !derivedHex) return false;
    const expected = Buffer.from(derivedHex, 'hex');
    const actual = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
    if (expected.length !== actual.length) return false;
    return crypto.timingSafeEqual(expected, actual);
}

function secretKey(): Uint8Array {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not set');
    return new TextEncoder().encode(secret);
}

export interface TokenPayload {
    userId: string;
    username: string;
}

export async function signToken(payload: TokenPayload): Promise<string> {
    return new SignJWT({ username: payload.username })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(payload.userId)
        .setIssuedAt()
        .setExpirationTime('30d')
        .sign(secretKey());
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
    try {
        const { payload } = await jwtVerify(token, secretKey());
        if (!payload.sub || typeof payload.username !== 'string') return null;
        return { userId: payload.sub, username: payload.username };
    } catch {
        return null;
    }
}

/** Bearer header first, then a `token` cookie (for the login-gated browser app). */
export function getBearerToken(req: VercelRequest): string | null {
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) return auth.slice('Bearer '.length);
    const cookie = req.headers.cookie;
    if (cookie) {
        const match = cookie
            .split(';')
            .map((c) => c.trim())
            .find((c) => c.startsWith('token='));
        if (match) return decodeURIComponent(match.slice('token='.length));
    }
    return null;
}

/** Resolve the authenticated user from a request, or null if unauthenticated. */
export async function requireUser(req: VercelRequest): Promise<TokenPayload | null> {
    const token = getBearerToken(req);
    if (!token) return null;
    return verifyToken(token);
}
